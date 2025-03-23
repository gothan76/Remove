import React, { useState, useRef } from "react";
import { removeBackground } from "@imgly/background-removal";
import * as bodyPix from "@tensorflow-models/body-pix";
import "@tensorflow/tfjs";

const BackgroundRemover = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [method, setMethod] = useState("tensorflow");
  const [loading, setLoading] = useState(false);
  const canvasRef = useRef(null);

  // 🎯 Handle Image Upload (File)
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(URL.createObjectURL(file));
    }
  };

  // 🎯 Handle Image Upload (URL)
  const handleURLUpload = () => {
    const url = prompt("Enter image URL:");
    if (url) {
      setSelectedImage(url);
    }
  };

  // 🎯 Process Image Based on Selected Method
  const processImage = async () => {
    if (!selectedImage) return;
    setLoading(true);

    try {
      if (method === "tensorflow") {
        await processWithTensorFlow();
      } else {
        await processWithImgly();
      }
    } catch (error) {
      console.error("❌ Error processing image:", error);
    }

    setLoading(false);
  };

  // 🎯 Process Image with TensorFlow (BodyPix)
  const processWithTensorFlow = async () => {
    try {
      const net = await bodyPix.load();
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = selectedImage;

      await new Promise((resolve) => (img.onload = resolve));

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      canvas.width = img.width;
      canvas.height = img.height;

      const segmentation = await net.segmentPerson(img, {
        internalResolution: "medium",
        segmentationThreshold: 0.6,
      });

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        if (segmentation.data[i / 4] === 0) {
          data[i + 3] = 0; // Remove background
        }
      }

      ctx.putImageData(imageData, 0, 0);
      setProcessedImage(canvas.toDataURL("image/png"));
    } catch (error) {
      console.error("Error processing with TensorFlow:", error);
    }
  };

  // 🎯 Process Image with Imgly
  const processWithImgly = async () => {
    if (!selectedImage) {
      console.error("❌ No image selected.");
      return;
    }
  
    try {
      console.log("Fetching image:", selectedImage);
  
      // Fetch image as a Blob
      const response = await fetch(selectedImage, { mode: "cors" });
  
      if (!response.ok) throw new Error("❌ Failed to fetch image");
  
      const blob = await response.blob();
      console.log("✅ Blob created:", blob);
  
      // Convert blob into a File object
      const file = new File([blob], "image.png", { type: blob.type });
  
      console.log("✅ File created:", file);
  
      // 🛑 Check if `removeBackground` is a function
      if (typeof removeBackground !== "function") {
        throw new Error("❌ removeBackground is not a function! Check the import.");
      }
  
      // 🛑 Log before sending the file to Imgly
      console.log("Image file being sent to Imgly:", file);
  
      // Process image with Imgly
      const result = await removeBackground(file);
      
      console.log("✅ Imgly result:", result);
  
      if (!result || !(result instanceof Blob)) {
        throw new Error("❌ Imgly returned an invalid result.");
      }
  
      // Convert processed image to URL
      const url = URL.createObjectURL(result);
      setProcessedImage(url);
    } catch (error) {
      console.error("❌ Error processing image with Imgly:", error);
    }
  };
  

  // 🎯 Download Processed Image
  const saveImage = async () => {
    const response = await fetch(processedImage);
    const blob = await response.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "processed_image.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 flex flex-col items-center gap-4">
      <h2 className="text-lg font-bold">Background Remover</h2>

      <input type="file" accept="image/*" onChange={handleImageUpload} />
      <button
        onClick={handleURLUpload}
        className="px-4 py-2 bg-purple-500 text-white rounded-md mt-2"
      >
        Load from URL
      </button>

      {selectedImage && (
        <img
          src={selectedImage}
          alt="Selected"
          className="mt-4 w-64 rounded-lg shadow-sm"
        />
      )}

      {/* Toggle Buttons for Method Selection */}
      <div className="mt-4 flex gap-2">
        <button
          className={`px-4 py-2 ${
            method === "tensorflow" ? "bg-blue-500 text-white" : "bg-gray-200"
          } rounded-md`}
          onClick={() => setMethod("tensorflow")}
        >
          Use TensorFlow
        </button>
        <button
          className={`px-4 py-2 ${
            method === "imgly" ? "bg-green-500 text-white" : "bg-gray-200"
          } rounded-md`}
          onClick={() => setMethod("imgly")}
        >
          Use Imgly
        </button>
      </div>

      {/* Remove Background Button */}
      <button
        onClick={processImage}
        className="mt-4 px-6 py-3 bg-red-500 text-white rounded-md"
        disabled={!selectedImage || loading}
      >
        {loading ? "Processing..." : `Remove Background (${method})`}
      </button>

      {processedImage && (
        <div className="mt-4">
          <h2 className="text-lg font-bold">Processed Image:</h2>
          <img
            src={processedImage}
            alt="Processed"
            className="border border-gray-300 mt-2"
          />
          <button
            onClick={saveImage}
            className="mt-2 px-4 py-2 bg-green-500 text-white rounded-md"
          >
            Download Image
          </button>
        </div>
      )}

      {/* Hidden Canvas for TensorFlow Processing */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
};

export default BackgroundRemover;

