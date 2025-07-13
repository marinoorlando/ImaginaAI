"use client";

import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import type { GeneratedImage } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Badge } from './ui/badge';
import { BarChart2 } from 'lucide-react'; // Importar el ícono

interface StatisticsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: GeneratedImage[];
}

interface CountData {
  name: string;
  count: number;
}

const processDataForChart = (items: (string[] | undefined)[], itemName: string): CountData[] => {
  const counts: { [key: string]: number } = {};
  items.forEach(itemList => {
    if (itemList) {
      itemList.forEach(item => {
        counts[item] = (counts[item] || 0) + 1;
      });
    }
  });
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count) // Sort by count descending
    .slice(0, 15); // Take top 15
};

const processObjectPropertyForChart = (items: (string | undefined)[], itemName: string): CountData[] => {
  const counts: { [key: string]: number } = {};
  items.forEach(item => {
    if (item) {
      counts[item] = (counts[item] || 0) + 1;
    }
  });
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);
};

const getLabel = (list: {value: string, label: string}[], value?: string) => {
  return list.find(item => item.value === value)?.label || value || 'N/A';
}

const artisticStylesList = [
  { value: 'none', label: 'Ninguno' },
  { value: 'Photorealistic', label: 'Fotorrealista' },
  { value: 'Cartoon', label: 'Dibujo Animado' },
  { value: 'Watercolor', label: 'Acuarela' },
  { value: 'Oil Painting', label: 'Pintura al Óleo' },
  { value: 'Pixel Art', label: 'Pixel Art' },
  { value: 'Anime', label: 'Anime' },
  { value: 'Cyberpunk', label: 'Cyberpunk' },
  { value: 'Fantasy Art', label: 'Arte Fantástico' },
  { value: 'Abstract', label: 'Abstracto' },
  { value: 'Impressionistic', label: 'Impresionista'},
  { value: 'Steampunk', label: 'Steampunk' },
  { value: 'Vintage Photography', label: 'Fotografía Vintage'},
  { value: 'Line Art', label: 'Arte Lineal'},
  { value: '3D Render', label: 'Render 3D'},
];


export function StatisticsDialog({ open, onOpenChange, images }: StatisticsDialogProps) {
  const tagData = useMemo(() => processDataForChart(images.map(img => img.tags), 'Etiqueta'), [images]);
  const collectionData = useMemo(() => processDataForChart(images.map(img => img.collections), 'Colección'), [images]);
  const styleData = useMemo(() => {
    const rawStyleData = processObjectPropertyForChart(images.map(img => img.artisticStyle), 'Estilo Artístico');
    return rawStyleData.map(item => ({
      name: getLabel(artisticStylesList, item.name),
      count: item.count,
    }));
  }, [images]);

  const ChartComponent = ({ data, dataKey, fill }: { data: CountData[], dataKey: string, fill: string }) => (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsBarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis type="category" dataKey="name" width={120} interval={0} style={{fontSize: '0.8rem'}}/>
        <Tooltip />
        <Legend />
        <Bar dataKey="count" name={dataKey} fill={fill} barSize={20}/>
      </RechartsBarChart>
    </ResponsiveContainer>
  );

  const NoDataComponent = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
      <BarChart2 className="w-12 h-12 mb-2" />
      <p>{message}</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Estadísticas de Imágenes</DialogTitle>
          <DialogDescription>
            Visualiza la frecuencia de uso de etiquetas, colecciones y estilos.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow">
          <Tabs defaultValue="tags" className="w-full p-1">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="tags">Etiquetas Manuales</TabsTrigger>
              <TabsTrigger value="collections">Colecciones (IA)</TabsTrigger>
              <TabsTrigger value="styles">Estilos Artísticos</TabsTrigger>
            </TabsList>
            <TabsContent value="tags">
              {tagData.length > 0 ? (
                <ChartComponent data={tagData} dataKey="Etiquetas" fill="hsl(var(--primary))" />
              ) : (
                <NoDataComponent message="No hay suficientes datos de etiquetas manuales para mostrar estadísticas." />
              )}
            </TabsContent>
            <TabsContent value="collections">
              {collectionData.length > 0 ? (
                <ChartComponent data={collectionData} dataKey="Colecciones" fill="hsl(var(--accent))" />
              ) : (
                <NoDataComponent message="No hay suficientes datos de colecciones (IA) para mostrar estadísticas." />
              )}
            </TabsContent>
            <TabsContent value="styles">
              {styleData.length > 0 ? (
                <ChartComponent data={styleData} dataKey="Estilos" fill="hsl(var(--secondary-foreground))" />
              ) : (
                <NoDataComponent message="No hay suficientes datos de estilos artísticos para mostrar estadísticas." />
              )}
            </TabsContent>
          </Tabs>
        </ScrollArea>
        <DialogFooter className="mt-auto pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
