'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ChevronDown, Search } from 'lucide-react';
import { DEFAULT_FONTS, GOOGLE_FONTS_API_KEY, GOOGLE_FONTS_API_URL } from '@/lib/editor/constants';
import { GoogleFont } from '@/types/editor';
import { cn } from '@/lib/utils';

interface FontSelectorProps {
  value: string;
  onChange: (font: string) => void;
}

export function FontSelector({ value, onChange }: FontSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fonts, setFonts] = useState<GoogleFont[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Google Fonts
  useEffect(() => {
    const loadGoogleFonts = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // If API key is available, fetch from Google Fonts API
        if (GOOGLE_FONTS_API_KEY) {
          const response = await fetch(
            `${GOOGLE_FONTS_API_URL}?key=${GOOGLE_FONTS_API_KEY}&sort=popularity`
          );
          
          if (!response.ok) {
            throw new Error('Failed to fetch fonts');
          }
          
          const data = await response.json();
          // Limit to top 100 fonts for performance
          const topFonts = data.items.slice(0, 100) as GoogleFont[];
          setFonts(topFonts);
        } else {
          // Fallback to default fonts list
          const defaultFontsList: GoogleFont[] = DEFAULT_FONTS.map((font) => ({
            family: font,
            variants: ['100', '200', '300', 'regular', '500', '600', '700', '800', '900'],
            subsets: ['latin'],
            category: 'sans-serif',
          }));
          setFonts(defaultFontsList);
        }
      } catch (err) {
        console.error('Error loading fonts:', err);
        setError('Failed to load fonts');
        // Fallback to default fonts on error
        const defaultFontsList: GoogleFont[] = DEFAULT_FONTS.map((font) => ({
          family: font,
          variants: ['regular', '500', '700'],
          subsets: ['latin'],
          category: 'sans-serif',
        }));
        setFonts(defaultFontsList);
      } finally {
        setLoading(false);
      }
    };

    loadGoogleFonts();
  }, []);

  // Load font when selected
  useEffect(() => {
    if (value && typeof window !== 'undefined') {
      // Check if font is already loaded
      const link = document.querySelector(`link[data-font="${value}"]`);
      if (!link) {
        // Create link element for Google Fonts
        const newLink = document.createElement('link');
        newLink.href = `https://fonts.googleapis.com/css2?family=${value.replace(
          / /g,
          '+'
        )}:wght@100;200;300;400;500;600;700;800;900&display=swap`;
        newLink.rel = 'stylesheet';
        newLink.setAttribute('data-font', value);
        document.head.appendChild(newLink);
      }
    }
  }, [value]);

  const filteredFonts = fonts.filter((font) =>
    font.family.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span style={{ fontFamily: value }}>{value || 'Select font...'}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search fonts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <ScrollArea className="h-80">
          <div className="p-2">
            {loading ? (
              <p className="text-sm text-gray-500 text-center py-4">
                Loading fonts...
              </p>
            ) : error ? (
              <p className="text-sm text-red-500 text-center py-4">
                {error}
              </p>
            ) : filteredFonts.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No fonts found
              </p>
            ) : (
              <div className="space-y-1">
                {filteredFonts.map((font) => (
                  <button
                    key={font.family}
                    onClick={() => {
                      onChange(font.family);
                      setOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition-colors',
                      value === font.family && 'bg-blue-50 text-blue-600'
                    )}
                    style={{ fontFamily: font.family }}
                  >
                    {font.family}
                  </button>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}