
"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  totalItems: number;
  isLoading?: boolean;
}

const ITEMS_PER_PAGE_OPTIONS = [12, 24, 36, 48, 96];

export function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
  totalItems,
  isLoading = false,
}: PaginationControlsProps) {

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handleFirstPage = () => {
    if (currentPage !== 1) {
        onPageChange(1);
    }
  };

  const handleLastPage = () => {
    if (currentPage !== totalPages && totalPages > 0) {
        onPageChange(totalPages);
    }
  };

  const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const countTextLoading = totalItems > 0 ? `Cargando... (Mostrando ${startItem}-${endItem} de ${totalItems} (Total: ${totalItems}) imágenes)` : 'Cargando...';
  const countTextDisplay = totalItems > 0 ? `Mostrando ${startItem}-${endItem} de ${totalItems} (Total: ${totalItems}) imágenes` : 'No hay imágenes que coincidan.';


  if (isLoading && totalItems === 0) { // Skeleton loader when initially loading and no items yet
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-card border rounded-lg shadow mb-6 space-y-2 sm:space-y-0">
        <Skeleton className="h-5 w-48" />
        <div className="flex items-center space-x-1 sm:space-x-2">
          <div className="flex items-center space-x-1">
            <Skeleton className="h-9 w-[70px]" />
          </div>
          <div className="flex items-center space-x-1">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
      </div>
    );
  }
  
  // Logic for when to show simplified controls (only items per page selector and count text)
  // vs full pagination buttons.
  // This condition means: if not loading, AND (either no items OR items fit on one page AND there's only one page calculated)
  if (!isLoading && (totalItems === 0 || (totalItems > 0 && totalItems <= itemsPerPage && totalPages <= 1))) {
    return (
      <div className="flex items-center justify-between p-4 bg-card border rounded-lg shadow mb-6">
        <span className="text-sm text-muted-foreground">
          {/* Use the consistent countTextDisplay even for few items if totalItems > 0 */}
          {totalItems > 0 ? countTextDisplay : 'No hay imágenes para mostrar.'}
        </span>
        {totalItems > 0 && ( // Only show items per page selector if there are items
            <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground hidden md:inline">Resultados por página:</span>
                <Select
                    value={String(itemsPerPage)}
                    onValueChange={(value) => onItemsPerPageChange(Number(value))}
                    disabled={isLoading}
                >
                    <SelectTrigger className="w-[70px] h-9">
                    <SelectValue placeholder={itemsPerPage} />
                    </SelectTrigger>
                    <SelectContent>
                    {ITEMS_PER_PAGE_OPTIONS.map(option => (
                        <SelectItem key={option} value={String(option)}>{option}</SelectItem>
                    ))}
                    </SelectContent>
                </Select>
            </div>
        )}
      </div>
    );
  }


  return (
    <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-card border rounded-lg shadow mb-6 space-y-2 sm:space-y-0">
      <div className="text-sm text-muted-foreground">
        {isLoading && totalItems > 0 ? countTextLoading : countTextDisplay}
      </div>
      <div className="flex items-center space-x-1 sm:space-x-2">
        <div className="flex items-center space-x-1">
            <span className="text-sm text-muted-foreground hidden md:inline">Resultados por página:</span>
            <Select
                value={String(itemsPerPage)}
                onValueChange={(value) => onItemsPerPageChange(Number(value))}
                disabled={isLoading}
            >
                <SelectTrigger className="w-[70px] h-9">
                <SelectValue placeholder={itemsPerPage} />
                </SelectTrigger>
                <SelectContent>
                {ITEMS_PER_PAGE_OPTIONS.map(option => (
                    <SelectItem key={option} value={String(option)}>{option}</SelectItem>
                ))}
                </SelectContent>
            </Select>
        </div>
        <div className="flex items-center space-x-1">
            <Button
            variant="outline"
            size="icon"
            onClick={handleFirstPage}
            disabled={currentPage === 1 || isLoading}
            className="h-9 w-9"
            aria-label="Primera página"
            >
            <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
            variant="outline"
            size="icon"
            onClick={handlePreviousPage}
            disabled={currentPage === 1 || isLoading}
            className="h-9 w-9"
            aria-label="Página anterior"
            >
            <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-1 sm:px-2 tabular-nums">
             {isLoading && totalPages === 0 ? 'Página - de -' : `Página ${currentPage} de ${totalPages > 0 ? totalPages : 1}`}
            </span>
            <Button
            variant="outline"
            size="icon"
            onClick={handleNextPage}
            disabled={currentPage === totalPages || totalPages === 0 || isLoading}
            className="h-9 w-9"
            aria-label="Página siguiente"
            >
            <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
            variant="outline"
            size="icon"
            onClick={handleLastPage}
            disabled={currentPage === totalPages || totalPages === 0 || isLoading}
            className="h-9 w-9"
            aria-label="Última página"
            >
            <ChevronsRight className="h-4 w-4" />
            </Button>
        </div>
      </div>
    </div>
  );
}

