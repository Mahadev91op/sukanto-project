"use client";
import { useEffect, useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Loader2, Camera } from "lucide-react";

export default function CameraScanner({ onScan, onClose }) {
  const [isStarting, setIsStarting] = useState(true);
  const scannerRef = useRef(null);
  const isUnmounting = useRef(false);

  useEffect(() => {
    isUnmounting.current = false;
    let html5QrCode;

    const startTimer = setTimeout(() => {
      if (isUnmounting.current) return;

      // Check secure context warning (camera usually needs HTTPS or localhost)
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn("navigator.mediaDevices is undefined. Insecure context (HTTP) blocks camera access on mobile. Attempting fallback anyway.");
      }

      // Try listing cameras first to request permission and choose rear camera
      Html5Qrcode.getCameras()
        .then((devices) => {
          if (isUnmounting.current) return;
          if (devices && devices.length > 0) {
            // Find rear/back camera
            const backCamera = devices.find((device) => {
              const label = device.label.toLowerCase();
              return label.includes("back") || label.includes("rear") || label.includes("environment");
            });
            // If back camera is found, use it, otherwise use the first camera device
            const cameraId = backCamera ? backCamera.id : devices[0].id;
            startScanner(cameraId);
          } else {
            // No camera device found or couldn't list, fallback to facingMode
            startScanner({ facingMode: "environment" });
          }
        })
        .catch((err) => {
          console.warn("Could not retrieve camera list, falling back to facingMode constraints:", err);
          startScanner({ facingMode: "environment" });
        });

      function startScanner(cameraIdOrConfig) {
        if (isUnmounting.current) return;

        html5QrCode = new Html5Qrcode("scanner-container");
        scannerRef.current = html5QrCode;

        html5QrCode
          .start(
            cameraIdOrConfig,
            {
              fps: 10,
              qrbox: { width: 250, height: 150 },
              aspectRatio: 1.0,
            },
            (decodedText) => {
              if (isUnmounting.current) return;
              isUnmounting.current = true;

              if (scannerRef.current) {
                scannerRef.current
                  .stop()
                  .then(() => {
                    scannerRef.current.clear();
                    onScan(decodedText);
                  })
                  .catch((err) => {
                    console.warn("Scanner stop issue (Ignored):", err);
                    onScan(decodedText);
                  });
              }
            },
            (errorMessage) => {
              // Ignore background scan errors
            }
          )
          .then(() => {
            if (isUnmounting.current) {
              html5QrCode.stop().catch(() => {});
            } else {
              setIsStarting(false);
            }
          })
          .catch((err) => {
            if (isUnmounting.current) return;
            if (err.name === "NotAllowedError" || err.message?.includes("Permission denied")) {
              alert("Bhai, Camera permission allow karni padegi scan karne ke liye!");
            } else {
              alert("Camera open karne me error aaya: " + (err.message || err));
            }
            setIsStarting(false);
            onClose();
          });
      }
    }, 300);

    return () => {
      isUnmounting.current = true;
      clearTimeout(startTimer);

      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current
              .stop()
              .then(() => {
                scannerRef.current.clear();
              })
              .catch((err) => console.warn("Cleanup warning:", err));
          } else {
            scannerRef.current.clear();
          }
        } catch (e) {
          console.warn("Sync cleanup warning:", e);
        }
      }
    };
  }, [onScan, onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center text-slate-800 font-bold">
            <Camera className="w-5 h-5 mr-2 text-emerald-600" />
            Live Camera Scanner
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-rose-100 text-rose-600 rounded-full hover:bg-rose-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Container */}
        <div className="relative w-full bg-black min-h-[300px] flex items-center justify-center">
          {/* Jab tak camera full load na ho jaye, ye spinner dikhega */}
          {isStarting && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10 bg-slate-900">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
              <p className="text-sm font-medium">Starting Camera...</p>
            </div>
          )}

          <div id="scanner-container" className="w-full"></div>
        </div>

        {/* Footer Info */}
        <div className="p-5 bg-white text-center">
          <p className="text-sm text-slate-600 font-semibold mb-1">
            Scan the Barcode
          </p>
          <p className="text-xs text-slate-400 font-medium">
            Sticker ko screen par dikh rahe box ke beech me rakhein.
          </p>
        </div>
      </div>
    </div>
  );
}