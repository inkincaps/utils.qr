import { QRCodeCard } from "./QRCodeCard";

interface QRCodeListProps {
  urls: string[];
  svgContents: string[];
  onLogoChange: (index: number, logoUri: string) => void;
}

export function QRCodeList({ urls, svgContents, onLogoChange }: QRCodeListProps) {
  return (
    <div className="fixed top-[144px] bottom-0 left-0 right-0 overflow-y-auto custom-scrollbar">
      <div className="max-w-2xl mx-auto space-y-6 p-4">
        {urls.map((url, index) => (
          <QRCodeCard
            key={index}
            index={index}
            url={url}
            svgContent={svgContents[index]}
            onLogoChange={onLogoChange}
          />
        ))}
      </div>
    </div>
  );
}