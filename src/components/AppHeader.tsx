
"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, BarChart2, LogOut, Trash2, Upload, Download, ChevronDown } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface AppHeaderProps {
  onClearHistory: () => void;
}

export function AppHeader({ onClearHistory }: AppHeaderProps) {
  const { toast } = useToast();
  // Mock admin state - in a real app, this would come from an auth context
  const [isAdmin, setIsAdmin] = React.useState(true); 
  const [isLoggedIn, setIsLoggedIn] = React.useState(true);

  const handleNotImplemented = () => {
    toast({
      title: "Función no implementada",
      description: "Esta característica estará disponible pronto.",
    });
  };

  const handleLoginToggle = () => {
    setIsLoggedIn(!isLoggedIn);
    toast({
      title: isLoggedIn ? "Sesión cerrada" : "Sesión iniciada (simulado)",
    });
  }

  return (
    <header className="bg-card border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary">Imagina AI HR</h1>
        <nav className="flex items-center space-x-2 md:space-x-4">
          <Button variant="ghost" size="sm" onClick={handleNotImplemented}>
            <BarChart2 className="h-4 w-4 mr-2" />
            Estadísticas
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                Gestionar Historial
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones del Historial</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleNotImplemented}>
                <Download className="h-4 w-4 mr-2" />
                Exportar Historial
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleNotImplemented}>
                <Upload className="h-4 w-4 mr-2" />
                Importar Historial
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onClearHistory} className="text-destructive focus:text-destructive-foreground focus:bg-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar Todo el Historial
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {isAdmin && (
            <Button variant="ghost" size="icon" onClick={handleNotImplemented} aria-label="Configuración">
              <Settings className="h-5 w-5" />
            </Button>
          )}
          
          <Button variant="outline" size="sm" onClick={handleLoginToggle}>
            <LogOut className="h-4 w-4 mr-2" />
            {isLoggedIn ? "Cerrar Sesión" : "Iniciar Sesión"}
          </Button>
        </nav>
      </div>
    </header>
  );
}
