import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import "./App.css";
import QRCode from "qrcode-svg";
import * as qr from 'qr-image';
import { Input } from "@/components/ui/input";
import { Origami } from "lucide-react";
import { ModeToggle } from "./components/ui/darkmodemenu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import JSZip from 'jszip';

function App() {
  const [svgContent, setSvgContent] = useState("");
  const [qrURL, setQrURL] = useState("");
  const [imageURI, setImageURI] = useState("");
  const [crlevel, setCrlevel] = useState<"L" | "M" | "Q" | "H">("M");

  const captureQr = () => {
    const qr = new QRCode({
      content: qrURL,
      padding: 4,
      width: 256,
      height: 256,
      color: "#000000",
      background: "#ffffff",
      ecl: crlevel,
    });

    const logoWidth = 50;
    const logoHeight = 50;
    const logoX = (256 - logoWidth) / 2;
    const logoY = (256 - logoHeight) / 2;

    const image = `<image href="${imageURI}" x="${logoX}" y="${logoY}" width="50" height="50" /> </svg>`;
    
    const finalSVG = imageURI 
      ? qr.svg().replace("</svg>", image)
      : qr.svg();

    setSvgContent(finalSVG);
  };

  const svgStringToPng = (svgString: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_DIMENSION = 4000;

        const imgAspectRatio = img.width / img.height;
        const canvasAspectRatio = MAX_DIMENSION / MAX_DIMENSION;
        const scale = imgAspectRatio > canvasAspectRatio
          ? MAX_DIMENSION / img.width
          : MAX_DIMENSION / img.height;

        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

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
          blob ? resolve(blob) : reject(new Error("Conversion failed"));
        }, "image/png");
      };
      img.onerror = reject;
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
    });
  };
  // generate eps
  const generateEps = (text: string) => {
    // Convert error correction level to qr-image format
    const ecLevel = crlevel.toLowerCase() as 'L' | 'M' | 'Q' | 'H';
    return qr.imageSync(text, { type: 'eps', ec_level: ecLevel });
  };

  const downloadQr = async () => {
    try {
      const zip = new JSZip();
      
      zip.file("qrcode.svg", svgContent);
      
      const pngBlob = await svgStringToPng(svgContent);
      zip.file("qrcode.png", pngBlob);

      const epsBuffer = generateEps(qrURL);
      const epsBlob = new Blob([epsBuffer]);
      zip.file("qrcode.eps", epsBlob);

      const content = await zip.generateAsync({ type: "blob" });
      
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = "qrcode.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating ZIP file:", error);
    }
  };

  useEffect(() => {
    if (qrURL) {
      captureQr();
    }
  }, [imageURI, qrURL, crlevel]);

  return (
    <>
      <div className="fixed right-10 top-4"> 
        <ModeToggle />
      </div>
      
      <div className="fixed left-10 justify-center"> 
  <h1 className="text-2xl font-bold mb-4 flex gap-3 justify-center items-center">
    <Origami className="mt-1" />
    Quick Response Codes
    {qrURL && (
      <DropdownMenu>
        <TooltipProvider> 
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <div className="ml-2 bg-gray-100 px-2 py-1 rounded text-sm cursor-pointer">
                  {crlevel}
                </div>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">
              QR code error correction level
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setCrlevel("L")}>Low</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setCrlevel("M")}>Medium</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setCrlevel("Q")}>Quartile</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setCrlevel("H")}>High</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )}
  </h1>
</div>

      <div className="flex gap-2 sm:w-[50%] mb-5 justify-center mx-auto mt-20">
        <Input
          type="text"
          placeholder="Wow, such blank. Much creativity."
          onChange={(e) => setQrURL(e.target.value)}
          onKeyDown={(e) => e.code === "Enter" && captureQr()}
        />
        {qrURL && <Button onClick={downloadQr}>Download</Button>}
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
                reader.onloadend = () => setImageURI(reader.result as string);
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
          className="justify-center flex"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      )}
    </>
  );
}

export default App;


