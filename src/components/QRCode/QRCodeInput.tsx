import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface QRCodeInputProps {
  onValuesChange: (values: string[]) => void;
  onDownload: () => void;
  hasContent: boolean;
}

export function QRCodeInput({ onValuesChange, onDownload, hasContent }: QRCodeInputProps) {
  return (
    <div className="fixed top-20 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-40 px-4 py-6 border-b">
      <div className="flex gap-2 max-w-2xl mx-auto">
        <Input
          type="text"
          placeholder="Wow, such blank. Much creativity. Add Commas to add multiple values"
          className="flex-1"
          onChange={(e) => {
            const values = e.target.value
              .split(",")
              .map((val) => val.trim())
              .filter((val) => val);
            onValuesChange(values);
          }}
        />
        {hasContent && (
          <Button onClick={onDownload} className="whitespace-nowrap">
            Download All
          </Button>
        )}
      </div>
    </div>
  );
}