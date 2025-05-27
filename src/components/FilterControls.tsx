
"use client";

import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Search, X } from 'lucide-react';

interface FilterControlsProps {
  onFilterChange: (filters: { searchTerm?: string; isFavorite?: boolean }) => void;
}

export function FilterControls({ onFilterChange }: FilterControlsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    onFilterChange({ searchTerm: e.target.value, isFavorite });
  };

  const handleFavoriteChange = (checked: boolean) => {
    setIsFavorite(checked);
    onFilterChange({ searchTerm, isFavorite: checked });
  };

  const clearSearch = () => {
    setSearchTerm('');
    onFilterChange({ searchTerm: '', isFavorite });
  };

  return (
    <div className="p-4 bg-card border rounded-lg shadow space-y-4">
      <h3 className="text-lg font-semibold">Filtrar Imágenes</h3>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar por prompt o etiquetas..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="pl-10 pr-10"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            onClick={clearSearch}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="favorite-filter"
          checked={isFavorite}
          onCheckedChange={handleFavoriteChange}
        />
        <Label htmlFor="favorite-filter">Mostrar Solo Favoritas</Label>
      </div>
    </div>
  );
}
