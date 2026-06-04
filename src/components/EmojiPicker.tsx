import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const CURATED = [
  "📘","📗","📕","📙","📚","🎓","🧠","💡","🚀","🔭",
  "💻","🖥️","📱","⌨️","🖱️","🌐","🔐","🛡️","🤖","☁️",
  "🎨","🖌️","✏️","📝","📐","📊","📈","🧮","⚗️","🔬",
  "🧪","🛠️","⚙️","🔧","🏗️","🎬","🎵","🎮","📷","🎙️",
  "💰","💼","📦","🌱","⚡","🔥","🏆","⭐","🎯","🧭",
];

export function EmojiPicker({ value, onChange }: { value: string; onChange: (e: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className="h-10 w-14 text-2xl px-0">
            {value || "📘"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2">
          <div className="grid grid-cols-8 gap-1">
            {CURATED.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => { onChange(e); setOpen(false); }}
                className={`h-9 w-9 grid place-items-center rounded-md text-xl hover:bg-secondary transition ${value === e ? "bg-primary/15 ring-1 ring-primary" : ""}`}
              >
                {e}
              </button>
            ))}
          </div>
          <Input
            className="mt-2"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Or paste any emoji"
            maxLength={4}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}