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

  const downloadQr = () => {
    const link = document.createElement("a");
    link.href = `data:image/svg+xml;base64,${btoa(svgContent)}`;
    link.download = "qrcode.svg";
    document.body.appendChild(link);
    link.click();
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
