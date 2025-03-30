import React, { useState, useRef } from "react";
import { removeBackground } from "@imgly/background-removal";
import * as bodyPix from "@tensorflow-models/body-pix";
import "@tensorflow/tfjs";

const BackgroundRemover = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [method, setMethod] = useState("tensorflow");
  const [loading, setLoading] = useState(false);
  const [showOriginal, setShowOriginal] = useState(true);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) setSelectedImage(URL.createObjectURL(file));
  };

  const handleURLUpload = () => {
    const url = prompt("Enter image URL:");
    if (url) setSelectedImage(url);
  };

  const triggerFileInput = () => fileInputRef.current.click();

  const processImage = async () => {
    if (!selectedImage) return;
    setLoading(true);
    try {
      method === "tensorflow" ? await processWithTensorFlow() : await processWithImgly();
    } catch (error) {
      console.error("❌ Error processing image:", error);
    }
    setLoading(false);
  };

  const processWithTensorFlow = async () => {
    try {
      const net = await bodyPix.load();
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = selectedImage;
      await new Promise((resolve) => (img.onload = resolve));

      const canvas = canvasRef.current;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      const segmentation = await net.segmentPerson(img, {
        internalResolution: "medium",
        segmentationThreshold: 0.6,
      });

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        if (segmentation.data[i / 4] === 0) data[i + 3] = 0;
      }
      ctx.putImageData(imageData, 0, 0);
      setProcessedImage(canvas.toDataURL("image/png"));
    } catch (error) {
      console.error("Error processing with TensorFlow:", error);
    }
  };

  const processWithImgly = async () => {
    try {
      const response = await fetch(selectedImage, { mode: "cors" });
      if (!response.ok) throw new Error("Failed to fetch image");

      const blob = await response.blob();
      const file = new File([blob], "image.png", { type: blob.type });
      const result = await removeBackground(file);

      if (!result || !(result instanceof Blob)) throw new Error("Invalid Imgly result");

      setProcessedImage(URL.createObjectURL(result));
    } catch (error) {
      console.error("Error processing with Imgly:", error);
    }
  };

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
      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} style={{ display: "none" }} />
      <div className="flex gap-2">
        <button className="px-4 py-2 bg-blue-500 text-white rounded-md" onClick={triggerFileInput}>Upload Image</button>
        <button className="px-4 py-2 bg-purple-500 text-white rounded-md" onClick={handleURLUpload}>Load from URL</button>
      </div>
      {selectedImage && (
        <div className="mt-4">
          <h2 className="text-lg font-bold">Preview:</h2>
          <img src={showOriginal ? selectedImage : processedImage} alt="Preview" className="mt-2 w-64 rounded-lg shadow-sm" />
          {processedImage && (
            <button className="mt-2 px-4 py-2 bg-gray-500 text-white rounded-md" onClick={() => setShowOriginal(!showOriginal)}>
              {showOriginal ? "Show Background Removed" : "Show Original"}
            </button>
          )}
        </div>
      )}
      <div className="mt-4 flex gap-2">
        <button className={`px-4 py-2 ${method === "tensorflow" ? "bg-blue-500 text-white" : "bg-gray-200"} rounded-md`} onClick={() => setMethod("tensorflow")}>
          Use TensorFlow
        </button>
        <button className={`px-4 py-2 ${method === "imgly" ? "bg-green-500 text-white" : "bg-gray-200"} rounded-md`} onClick={() => setMethod("imgly")}>
          Use Imgly
        </button>
      </div>
      <button onClick={processImage} className="mt-4 px-6 py-3 bg-red-500 text-white rounded-md" disabled={!selectedImage || loading}>
        {loading ? "Processing..." : `Remove Background (${method})`}
      </button>
      {processedImage && (
        <button onClick={saveImage} className="mt-4 px-4 py-2 bg-green-500 text-white rounded-md">Download Image</button>
      )}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
};

export default BackgroundRemover;

