import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCallback, useState } from "react";
import { debounce } from "lodash";

interface QRCodeInputProps {
  onValuesChange: (values: string[]) => void;
  onDownload: () => void;
  hasContent: boolean;
}

export function QRCodeInput({
  onValuesChange,
  onDownload,
  hasContent,
}: QRCodeInputProps) {
  const [inputValue, setInputValue] = useState<string>("");

  const debouncedHandleChange = useCallback(
    debounce((value: string) => {
      const values = value
        .split(",")
        .map((val) => val.trim())
        .filter((val) => val);
      onValuesChange(values);
    }, 500),
    [onValuesChange]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    debouncedHandleChange(newValue);
  };

  return (
    <div className="fixed top-20 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-40 px-4 py-6 border-b">
      <div className="flex gap-2 max-w-2xl mx-auto">
        <Input
          type="text"
          placeholder="Wow, such blank. Much creativity. Add Commas to add multiple values"
          className="flex-1"
          value={inputValue}
          onChange={handleInputChange}
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
