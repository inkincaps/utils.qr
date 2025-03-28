# Lightning-Fast QR Code Generator in the Browser (Client-Side)

## Overview

The QR Code Generator is a simple tool that allows users to create QR codes for various types of data, including URLs, text, emails, and more. This project is useful for generating quick QR codes that can be scanned by mobile devices, with support for multiple export formats bundled in a convenient ZIP file.

## Features

- Generate QR codes from text, URLs, or other data inputs
- Download QR codes as a single ZIP file containing multiple Image formats (PNG, SVG, EPS)
- Customizable QR code error correction levels (L, M, Q, H)
- Support for different encoding formats
- Optional logo/image overlay support
- Dark mode support with system theme detection
- Enhanced UI with Radix UI components
- Fully client-side processing - no server required

## Installation

To run the QR Generator locally, follow these steps:

1. Clone the repository:
   ```sh
   git clone https://github.com/yourusername/utils.qr.git
   ```

2. Navigate to the project directory:
   ```sh
   cd utils.qr
   ```

3. Install dependencies:
   ```sh
   npm install
   ```

4. Start the development server:
   ```sh
   npm run dev
   ```

## Usage

1. Open the application in a browser
2. Enter the URL or text you want to encode in the QR code
3. (Optional) Upload a logo to overlay on the QR code
4. Select the desired error correction level (L, M, Q, H)
5. Generate the QR code
6. Click download to get a ZIP file containing the QR code in multiple formats (PNG, SVG, EPS)

## Technologies Used

- **Frontend Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **UI Components:** 
  - Radix UI (`@radix-ui/react-label`, `@radix-ui/react-slot`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-tooltip`)
  - Shadcn UI components
- **QR Code Generation:** 
  - `qrcode-svg` for SVG generation
  - `qr-image` for EPS format
  - `canvas` for PNG conversion
- **Additional Libraries:**
  - `JSZip` for bundling multiple formats
  - `buffer` for browser compatibility
  - `lucide-react` for icons
  - `next-themes` for dark mode support

## Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
