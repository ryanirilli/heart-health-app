"use client";

import { useActivityTypes } from "./ActivityProvider";
import { Button } from "@/components/ui/button";
import { ListFilter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ActivityFilterProps {
  selectedTypeId: string;
  onFilterChange: (id: string) => void;
}

export function ActivityFilter({ selectedTypeId, onFilterChange }: ActivityFilterProps) {
  const { activeTypes } = useActivityTypes();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-2 rounded-full px-2 font-normal hover:bg-muted/50">
          <ListFilter className="h-4 w-4" />
          <span>
            {selectedTypeId === "all" 
              ? "All Activities" 
              : activeTypes.find(t => t.id === selectedTypeId)?.name || "Filter"}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Filter Activity Types</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={selectedTypeId} onValueChange={onFilterChange}>
          <DropdownMenuRadioItem value="all">
            All Activities
          </DropdownMenuRadioItem>
          <DropdownMenuSeparator />
          {activeTypes.map((type) => (
            <DropdownMenuRadioItem key={type.id} value={type.id}>
              {type.name}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
