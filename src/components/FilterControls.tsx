
"use client";

import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Search, X } from 'lucide-react';

interface FilterControlsProps {
  onFilterChange: (filters: { searchTerm?: string; isFavorite?: true | undefined }) => void;
}

export function FilterControls({ onFilterChange }: FilterControlsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false); // Tracks the switch state

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    onFilterChange({ searchTerm: newSearchTerm, isFavorite: showOnlyFavorites ? true : undefined });
  };

  const handleFavoriteChange = (checked: boolean) => {
    setShowOnlyFavorites(checked);
    // If checked (switch ON), pass true to filter by favorites.
    // If unchecked (switch OFF), pass undefined to show all (no favorite filtering).
    onFilterChange({ searchTerm, isFavorite: checked ? true : undefined });
  };

  const clearSearch = () => {
    setSearchTerm('');
    onFilterChange({ searchTerm: '', isFavorite: showOnlyFavorites ? true : undefined });
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
          checked={showOnlyFavorites}
          onCheckedChange={handleFavoriteChange}
        />
        <Label htmlFor="favorite-filter">Mostrar Solo Favoritas</Label>
      </div>
    </div>
  );
}
