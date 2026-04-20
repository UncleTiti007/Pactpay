import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";

interface UserSearchProps {
  onSelect: (user: { id: string; full_name: string; email: string } | null) => void;
  onEmailChange: (email: string) => void;
  defaultValue?: string;
}

export function UserSearch({ onSelect, onEmailChange, defaultValue = "" }: UserSearchProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const [searchTerm, setSearchTerm] = useState("");
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If user types something that looks like an email and it's not in the list,
    // we still want to inform the parent.
    if (searchTerm.includes("@")) {
       onEmailChange(searchTerm);
    }
    
    if (searchTerm.length < 2) {
      setProfiles([]);
      return;
    }

    const searchUsers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(5);

      if (!error && data) {
        setProfiles(data);
      }
      setLoading(false);
    };

    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {value || "Search user by name or email..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search name or type email..."
            onValueChange={(val) => {
              setSearchTerm(val);
              setValue(val);
            }}
          />
          <CommandList>
            {loading && <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>}
            {!loading && profiles.length === 0 && searchTerm.length >= 2 && (
              <CommandEmpty>
                No registered user found for "{searchTerm}". 
                <p className="text-xs mt-1 text-primary">They will receive an email invitation to join.</p>
              </CommandEmpty>
            )}
            <CommandGroup>
              {profiles.map((profile) => (
                <CommandItem
                  key={profile.id}
                  value={profile.full_name}
                  onSelect={() => {
                    setValue(profile.full_name);
                    onSelect(profile);
                    setOpen(false);
                  }}
                  className="flex flex-col items-start gap-0.5"
                >
                  <div className="flex items-center w-full">
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === profile.full_name ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="font-medium">{profile.full_name}</span>
                  </div>
                  <span className="pl-6 text-xs text-muted-foreground">
                    {profile.email}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
