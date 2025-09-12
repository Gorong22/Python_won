# Daily Arts BG Frame - Light/Dark Mode Implementation

This project implements the "BG" frame from the Figma design with comprehensive light and dark mode support, interactive features, and modern web development best practices.

## 🎨 Features

### Theme Support
- **Light Mode**: Clean, bright interface with dark text on white backgrounds
- **Dark Mode**: Elegant dark interface with light text on dark backgrounds
- **Automatic Detection**: Respects system theme preferences
- **Persistent Storage**: Remembers user's theme choice
- **Smooth Transitions**: Elegant animations between theme changes

### Interactive Elements
- **Theme Toggle**: Floating button with sun/moon icons
- **Button Interactions**: Ripple effects and loading states
- **Profile Cards**: Click to expand images, view user info
- **Like System**: Interactive heart buttons with animations
- **View Tracking**: Eye icon interactions with count updates
- **Keyboard Navigation**: Full keyboard accessibility support

### Performance & Accessibility
- **Intersection Observer**: Optimized animations and lazy loading
- **Focus Management**: Proper keyboard navigation and focus indicators
- **Screen Reader Support**: Semantic HTML and ARIA considerations
- **Performance Monitoring**: Built-in performance metrics tracking

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Local web server (for development)

### Installation
1. Clone or download the project files
2. Ensure all three files are in the same directory:
   - `index.html`
   - `styles.css`
   - `script.js`

### Running the Project
1. **Simple Method**: Double-click `index.html` to open in browser
2. **Development Server**: Use a local server for best experience:
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```
3. Open `http://localhost:8000` in your browser

## 🎯 Usage

### Theme Switching
- **Click the theme toggle button** (☀️/🌙) in the top-right corner
- **Keyboard shortcut**: Press `Ctrl/Cmd + T` to toggle themes
- **System preference**: Automatically follows your OS theme setting

### Navigation
- **Mouse**: Click buttons, profile cards, and interactive elements
- **Keyboard**: Use Tab, Arrow keys, and Enter for navigation
- **Touch**: Full touch support for mobile devices

### Interactive Features
- **Profile Images**: Click to view in full-screen modal
- **Like Buttons**: Click heart icons to like/unlike content
- **View Buttons**: Click eye icons to record views
- **Navigation Buttons**: Interactive buttons with loading states

## 🏗️ Architecture

### File Structure
```
├── index.html          # Main HTML structure
├── styles.css          # CSS with CSS variables for theming
└── script.js           # JavaScript functionality
```

### CSS Architecture
- **CSS Variables**: Centralized color and style definitions
- **Component-based**: Modular CSS for each UI component
- **Responsive Design**: Mobile-first approach with breakpoints
- **Dark Mode**: Comprehensive dark theme implementation

### JavaScript Architecture
- **Class-based**: Modular, maintainable code structure
- **Event-driven**: Responsive user interactions
- **Performance-focused**: Optimized animations and loading
- **Accessibility-first**: Keyboard navigation and screen reader support

## 🎨 Theme System

### Light Mode Colors
```css
--bg-primary: #ffffff
--text-primary: #000000
--button-bg: #000000
--button-text: #ffffff
```

### Dark Mode Colors
```css
--bg-primary: #1a1a1a
--text-primary: #ffffff
--button-bg: #ffffff
--button-text: #000000
```

### CSS Variables
The theme system uses CSS custom properties for easy customization:
- Background colors
- Text colors
- Border colors
- Shadow effects
- Button styles

## 🔧 Customization

### Adding New Themes
1. Define new color variables in `:root`
2. Create theme class (e.g., `.custom-theme`)
3. Override CSS variables for the new theme
4. Add theme switching logic in JavaScript

### Modifying Colors
Edit the CSS variables in `styles.css`:
```css
:root {
    --bg-primary: #your-color;
    --text-primary: #your-color;
    /* ... other variables */
}
```

### Adding New Components
1. Add HTML structure in `index.html`
2. Style with CSS classes in `styles.css`
3. Add interactivity in `script.js`

## 📱 Responsive Design

### Breakpoints
- **Mobile**: 320px and below
- **Tablet**: 321px to 768px
- **Desktop**: 769px and above

### Mobile Optimizations
- Touch-friendly button sizes
- Optimized spacing for small screens
- Responsive image handling
- Mobile-first CSS approach

## ♿ Accessibility Features

### Keyboard Navigation
- Tab order optimization
- Focus indicators
- Keyboard shortcuts
- Arrow key navigation

### Screen Reader Support
- Semantic HTML structure
- Proper heading hierarchy
- Alt text for images
- ARIA labels where needed

### Visual Accessibility
- High contrast ratios
- Clear focus states
- Consistent visual hierarchy
- Readable typography

## 🚀 Performance Features

### Optimizations
- Intersection Observer for animations
- Lazy loading for images
- Efficient event handling
- Minimal DOM manipulation

### Monitoring
- Page load time tracking
- Performance metrics logging
- Console performance data
- Real-time performance monitoring

## 🧪 Testing

### Browser Compatibility
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

### Device Testing
- Desktop browsers
- Mobile browsers
- Tablet devices
- Various screen sizes

## 🔮 Future Enhancements

### Planned Features
- **More Themes**: Seasonal themes, custom color schemes
- **Animation Library**: Advanced CSS animations
- **PWA Support**: Service worker and offline functionality
- **Internationalization**: Multi-language support
- **Advanced Interactions**: Gesture support, drag & drop

### Technical Improvements
- **TypeScript**: Type safety and better development experience
- **Build System**: Webpack/Vite for optimization
- **Testing Framework**: Jest/Testing Library
- **CI/CD**: Automated testing and deployment

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines
1. Follow existing code style
2. Add comments for complex logic
3. Test across different browsers
4. Ensure accessibility compliance
5. Update documentation as needed

## 📞 Support

If you encounter any issues or have questions:
1. Check the browser console for error messages
2. Verify all files are in the same directory
3. Ensure you're using a modern web browser
4. Check that JavaScript is enabled

## 🎉 Credits

- **Design**: Based on Figma design from Daily Arts project
- **Icons**: Custom SVG icons and system icons
- **Fonts**: Inter, SF Pro Text, SF Pro Display, Noto Sans KR
- **Implementation**: Modern web development best practices

---

**Enjoy using the Daily Arts BG Frame with beautiful light and dark modes!** ✨
