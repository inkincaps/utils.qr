import { Origami } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface QRCodeHeaderProps {
  crlevel: "L" | "M" | "Q" | "H";
  setCrlevel: (level: "L" | "M" | "Q" | "H") => void;
  hasContent: boolean;
}

export function QRCodeHeader({ crlevel, setCrlevel, hasContent }: QRCodeHeaderProps) {
  return (
    <div className="fixed left-10 top-4 z-50">
      <h1 className="text-2xl font-bold flex gap-3 items-center">
        <Origami className="mt-1" />
        Quick Response Codes
        {hasContent && (
          <DropdownMenu>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <div className="ml-2 bg-muted px-2 py-1 rounded text-sm cursor-pointer">
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
  );
}