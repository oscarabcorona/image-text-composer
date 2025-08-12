# Image Text Composer

A desktop-only, single-page image editing tool that enables users to upload images and overlay them with fully customizable text layers. Built with Next.js, TypeScript, and Fabric.js following SOLID principles.

## 🎯 Live Demo

[View Live Demo](#) _(Deployment link will be added here)_

## ✨ Features

### Core Features
- **📸 Image Upload**: 
  - Supports PNG, JPEG, GIF, and WebP formats
  - Canvas automatically matches uploaded image aspect ratio
  - Maintains original image dimensions for export
  
- **📝 Multiple Text Layers**: 
  - Add unlimited text layers
  - Full editing capabilities for each layer
  - Independent styling and transformation
  
- **🎨 Text Properties**:
  - Font family (Google Fonts API integration with 100+ fonts)
  - Font size (8-200px)
  - Font weight (100-900)
  - Color picker with opacity control
  - Text alignment (left, center, right)
  - Line height adjustment
  - Letter spacing control
  - Multi-line text support
  
- **📚 Layer Management**:
  - Drag-and-drop reordering
  - Show/hide layers
  - Lock/unlock layers
  - Duplicate layers with one click
  - Delete layers with confirmation
  - Visual layer panel with thumbnails
  
- **🎯 Canvas Interactions**:
  - Drag to move text layers
  - Resize with corner handles
  - Rotate with rotation handle
  - Snap-to-center guides (vertical & horizontal)
  - Arrow key nudging (1px, 10px with Shift)
  - Smooth, responsive interactions
  
- **🔄 History System**:
  - Undo/Redo up to 20 steps
  - Visible history panel showing all actions
  - Jump to any point in history
  - Keyboard shortcuts (Ctrl/Cmd+Z, Ctrl/Cmd+Y)
  - Action descriptions for clarity
  
- **💾 Persistence**:
  - Auto-save to browser localStorage
  - Restore work on page refresh
  - Reset button to clear and start fresh
  
- **📥 Export**:
  - Export as PNG maintaining original image dimensions
  - High-quality output with text overlay

## 🚀 Technology Stack

- **Framework**: Next.js 15.4.6 with TypeScript
- **Canvas Library**: Fabric.js 6.7.1 
- **State Management**: Zustand 5.0.7
- **UI Components**: Shadcn/ui with Tailwind CSS v4
- **Font Integration**: Google Fonts API
- **Testing**: Playwright for E2E tests
- **Package Manager**: pnpm

## 🏗️ Architecture

### Project Structure
```
src/
├── app/               # Next.js app directory
├── components/
│   └── editor/       # Editor UI components
│       ├── EditorCanvas.tsx      # Main canvas component
│       ├── EditorToolbar.tsx     # Top toolbar
│       ├── LayerPanel.tsx        # Layer management
│       ├── TextPropertiesPanel.tsx # Text styling
│       ├── HistoryPanel.tsx      # History visualization
│       └── FontSelector.tsx      # Google Fonts selector
├── hooks/
│   └── editor/       # Custom React hooks
├── lib/
│   └── editor/       
│       ├── store.ts             # Zustand store
│       ├── constants.ts         # App constants
│       ├── commands/            # Command pattern implementation
│       ├── services/            # Service layer (SOLID)
│       └── utils/               # Utility functions
└── types/            # TypeScript type definitions
```

### Key Design Decisions

1. **Fabric.js v6**: Latest version with improved performance and TypeScript support
2. **Zustand**: Lightweight state management with excellent TypeScript integration
3. **SOLID Principles**: 
   - Service-oriented architecture
   - Dependency injection
   - Interface segregation
   - Command pattern for undo/redo
4. **Performance Optimizations**:
   - Canvas ref stability to prevent re-renders
   - Debounced auto-save
   - Efficient layer rendering

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/image-text-composer.git
   cd image-text-composer
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.local.example .env.local
   ```
   
   Add your Google Fonts API key (optional - falls back to default fonts):
   ```
   NEXT_PUBLIC_GOOGLE_FONTS_API_KEY=your_api_key_here
   ```

4. Run the development server:
   ```bash
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📦 Build and Deployment

### Production Build
```bash
pnpm build
pnpm start
```

### Deploy to Vercel
```bash
vercel
```

The app is optimized for deployment on Vercel with zero configuration needed.

## 📝 Scripts

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm type-check` - Run TypeScript type checking
- `pnpm test` - Run Playwright tests

## ✅ Implemented Bonus Features

- ✅ **Line height and letter spacing controls**: Full typography control
- ✅ **Duplicate layers**: One-click layer duplication
- ✅ **Lock/unlock layers**: Prevent accidental edits
- ✅ **Visible history panel**: See and navigate through all actions
- ✅ **SOLID architecture**: Clean, maintainable codebase
- ✅ **Multiple image format support**: PNG, JPEG, GIF, WebP

## 🔧 Configuration

### Google Fonts API
To use the full Google Fonts library:
1. Get an API key from [Google Fonts Developer API](https://developers.google.com/fonts/docs/developer_api)
2. Add to `.env.local`
3. The app will automatically load 100+ popular fonts

### Canvas Limits
- Maximum canvas size: 1920x1080
- Maximum image upload size: No hard limit (automatically scaled)
- History steps: 20 (configurable in constants)

## 💡 Usage Tips

- **Keyboard Shortcuts**:
  - `Ctrl/Cmd + Z`: Undo
  - `Ctrl/Cmd + Y`: Redo
  - `Arrow Keys`: Nudge selected text (hold Shift for 10px)
  
- **Layer Management**:
  - Drag layers to reorder
  - Click eye icon to show/hide
  - Click lock icon to prevent edits
  - Click copy icon to duplicate
  
- **Text Editing**:
  - Double-click text to edit inline
  - Use properties panel for precise control
  - Multi-line text supported (Enter for new line)

## 🐛 Known Limitations

- Desktop-only (no mobile/touch support by design)
- Browser localStorage limit (~5-10MB)
- Google Fonts require internet connection
- WebGL performance varies by GPU

## 🌐 Browser Support

- Chrome 90+ (recommended)
- Firefox 88+
- Safari 14+
- Edge 90+

## 🚀 Performance

- Optimized canvas rendering
- Debounced auto-save (1 second)
- Efficient layer management
- Lazy font loading
- Image dimension preservation

## 🧪 Testing

Run the test suite:
```bash
pnpm test
```

Tests include:
- Image upload functionality
- Canvas interactions
- Layer management
- Export functionality
- Cross-browser compatibility

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Fabric.js](http://fabricjs.com/) for the powerful canvas library
- [Shadcn/ui](https://ui.shadcn.com/) for beautiful UI components
- [Google Fonts](https://fonts.google.com/) for the typography options
- [Vercel](https://vercel.com/) for hosting and deployment

---

Built with ❤️ using modern web technologies