import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import "./App.css";
import QRCode from "qrcode-svg";
import { Input } from "@/components/ui/input";
import { Origami } from "lucide-react";

function App() {
  const [svgContent, setsvgContent] = useState("");
  const [qrURL, setQrURL] = useState("");
  const [imageURI, setImageURI] = useState("");
  const captureQr = () => {
    const qr = new QRCode({
      content: qrURL,
      padding: 4,
      width: 256,
      height: 256,
      color: "#000000",
      background: "#ffffff",
      ecl: "M",
    });
    const logoWidth = 50;
    const logoHeight = 50;
    const logoX = (256 - logoWidth) / 2;
    const logoY = (256 - logoHeight) / 2;

    const image = `<image href="${imageURI}" x="${logoX}"  y="${logoY}" width="50" height="50" /> </svg>`;
    if (imageURI) {
      const qrWithImg = qr.svg().replaceAll("</svg>", image);
      setsvgContent(qrWithImg);
    } else {
      setsvgContent(qr.svg());
    }
    console.log(svgContent);
  };
  // @ts-expect-error fuck this
  function svgStringtoPng(svgString, callback) {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX_DIMENSION = 4000; // Maximum allowed dimension

      // Calculate aspect ratio and scale
      const imgAspectRatio = img.width / img.height;
      const canvasAspectRatio = MAX_DIMENSION / MAX_DIMENSION;
      let scale;

      if (imgAspectRatio > canvasAspectRatio) {
        scale = MAX_DIMENSION / img.width;
      } else {
        scale = MAX_DIMENSION / img.height;
      }

      // Set canvas dimensions based on scale and aspect ratio
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");
      // @ts-expect-error fuck this
      ctx.drawImage(
        img,
        0,
        0,
        img.width,
        img.height,
        0,
        0,
        canvas.width,
        canvas.height
      );

      canvas.toBlob((blob) => {
        // @ts-expect-error fuck this
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "qrcode.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        callback(null, url); // Optionally return the URL
      }, "image/png");
    };
    img.src =
      "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);
  }

  const downloadQr = () => {
    const link = document.createElement("a");
    link.href = `data:image/svg+xml;base64,${btoa(svgContent)}`;
    link.download = "qrcode.svg";
    document.body.appendChild(link);
    link.click();

    // @ts-expect-error fuck this
    svgStringtoPng(svgContent, (err, url) => {
      if (err) {
        console.error("Error converting SVG to PNG:", err);
      } else {
        console.log("PNG image URL:", url);
      }
    });
    document.body.removeChild(link);
  };
  useEffect(() => {
    if (qrURL) {
      captureQr();
    }
  }, [imageURI, qrURL]);
  return (
    <>
      <h1 className="text-2xl font-bold mb-4 flex gap-3 justify-center items-center">
        {" "}
        <Origami className="mt-1" />
        Quick Response Codes
      </h1>
      <div className="flex gap-2 sm:w-[50%] mb-5 justify-center mx-auto mt-20">
        <Input
          type="text "
          placeholder="Wow, such blank. Much creativity."
          onChange={(e) => setQrURL(e.target.value)}
          onKeyDown={(e) => (e.code == "Enter" ? captureQr() : null)}
        />

        {qrURL && <Button onClick={() => downloadQr()}>Download</Button>}
      </div>

      {qrURL && (
        <div className="flex flex-col gap-2 sm:w-[50%] mb-5 mx-auto mt-8">
          <Label htmlFor="logo" className="text-center">
            Oh, you want to add a logo too?
          </Label>
          <Input
            type="file"
            className="pt-[6px]"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                  setImageURI(reader.result as string);
                  console.log(reader.result);
                };
                reader.readAsDataURL(file);
              } else {
                setImageURI("");
              }
            }}
          />
        </div>
      )}

      {qrURL && (
        <div
          className="justify-center  flex"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        ></div>
      )}
    </>
  );
}

export default App;
