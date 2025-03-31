import { useEffect, useState } from "react";
import QRCode from "qrcode-svg";
import * as qr from "qr-image";
import JSZip from "jszip";
import { ModeToggle } from "./components/ui/darkmodemenu";
import { QRCodeHeader } from "./components/QRCode/QRCodeHeader";
import { QRCodeInput } from "./components/QRCode/QRCodeInput";
import { QRCodeList } from "./components/QRCode/QRCodeList";

function App() {
  const [svgContents, setSvgContents] = useState<string[]>([]);
  const [qrURL, setQrURL] = useState<string[]>([]);
  const [imageURIs, setImageURIs] = useState<string[]>([]);
  const [crlevel, setCrlevel] = useState<"L" | "M" | "Q" | "H">("M");

  const captureQr = (index: number) => {
    if (!qrURL[index]?.trim()) {
      return;
    }

    const qr = new QRCode({
      content: qrURL[index],
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

    const currentLogo = imageURIs[index];
    const image = `<image href="${currentLogo}" x="${logoX}" y="${logoY}" width="50" height="50" /> </svg>`;
    const finalSVG = currentLogo ? qr.svg().replace("</svg>", image) : qr.svg();

    setSvgContents((prev) => {
      const newContents = [...prev];
      newContents[index] = finalSVG;
      return newContents;
    });
  };

  const svgStringToPng = (svgString: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_DIMENSION = 4000;

        const imgAspectRatio = img.width / img.height;
        const canvasAspectRatio = MAX_DIMENSION / MAX_DIMENSION;
        const scale =
          imgAspectRatio > canvasAspectRatio
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
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        svgString
      )}`;
    });
  };

  // generate eps
  const generateEps = (text: string) => {
    const ecLevel = crlevel.toLowerCase() as "L" | "M" | "Q" | "H";
    return qr.imageSync(text, { type: "eps", ec_level: ecLevel });
  };

  const downloadQr = async () => {
    try {
      const zip = new JSZip();

      for (let index = 0; index < qrURL.length; index++) {
        const folderName = `qrcode_${index + 1}`;
        zip.file(`${folderName}/qrcode.svg`, svgContents[index]);

        // Add PNG and EPS versions
        const pngBlob = await svgStringToPng(svgContents[index]);
        zip.file(`${folderName}/qrcode.png`, pngBlob);

        const epsBuffer = generateEps(qrURL[index]);
        const epsBlob = new Blob([epsBuffer]);
        zip.file(`${folderName}/qrcode.eps`, epsBlob);
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = url;
      link.download = "qrcodes.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating ZIP file:", error);
    }
  };

  const handleValuesChange = (values: string[]) => {
    setQrURL(values);
    setImageURIs(new Array(values.length).fill(""));
    setSvgContents(new Array(values.length).fill(""));
  };

  const handleLogoChange = (index: number, logoUri: string) => {
    setImageURIs((prev) => {
      const newImageURIs = [...prev];
      newImageURIs[index] = logoUri;
      return newImageURIs;
    });
  };

  useEffect(() => {
    qrURL.forEach((_, index) => {
      captureQr(index);
    });
  }, [qrURL, imageURIs, crlevel]);

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <div className="fixed right-10 top-4 z-50">
        <ModeToggle />
      </div>

      <QRCodeHeader
        crlevel={crlevel}
        setCrlevel={setCrlevel}
        hasContent={qrURL.length > 0}
      />
      <QRCodeInput
        onValuesChange={handleValuesChange}
        onDownload={downloadQr}
        hasContent={qrURL.length > 0}
      />
      <QRCodeList
        urls={qrURL}
        svgContents={svgContents}
        onLogoChange={handleLogoChange}
      />
    </div>
  );
}

export default App;
