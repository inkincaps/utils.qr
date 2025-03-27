import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface QRCodeCardProps {
  index: number;
  url: string;
  svgContent: string;
  onLogoChange: (index: number, logoUri: string) => void;
}

export function QRCodeCard({ index, url, svgContent, onLogoChange }: QRCodeCardProps) {
  return (
    <div className="p-6 rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md">
      <div className="text-sm font-medium mb-4">
        QR Code {index + 1}: {url}
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`logo-${index}`} className="text-center block">
            Add logo for QR Code {index + 1}
          </Label>
          <Input
            id={`logo-${index}`}
            type="file"
            className="pt-[6px]"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onloadend = () => {
                  onLogoChange(index, reader.result as string);
                };
                reader.readAsDataURL(file);
              } else {
                onLogoChange(index, "");
              }
            }}
          />
        </div>

        <div 
          className="flex justify-center items-center p-4 bg-white rounded-lg"
          dangerouslySetInnerHTML={{ __html: svgContent || '' }}
        />
      </div>
    </div>
  );
}