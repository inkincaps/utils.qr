# QR Code Generator

## Overview
The QR Code Generator is a simple tool that allows users to create QR codes for various types of data, including URLs, text, emails, and more. This project is useful for generating quick QR codes that can be scanned by mobile devices.

## Features
- Generate QR codes from text, URLs, or other data inputs
- Download QR codes as image files (PNG, JPG, SVG, PDF, etc.)
- Customizable QR code size and colors
- Support for different encoding formats
- Convert QR codes from SVG to PNG using `svg2png`
- Export QR codes as PDFs using `html-pdf`
- Enhanced UI with Radix UI components

## Installation
To run the QR Generator locally, follow these steps:

1. Clone the repository:
  
2. Navigate to the project directory:
  
3. Install dependencies:
   ```sh
   npm install  # Install all required packages
   ```
4. Start the application:
   ```sh
   npm run dev  # Run the development server
   ```

## Usage
1. Open the application in a browser.
2. Enter the data you want to encode in the QR code.
3. Customize the QR code settings if necessary.
4. Generate the QR code.
5. Download or share the generated QR code.

## Technologies Used
- **Frontend:** React, Tailwind CSS, Radix UI (`@radix-ui/react-label`, `@radix-ui/react-slot`)
- **QR Code Generation:** `qrcode-svg`, `canvas`
- **Image Processing:** `svg2png`, `svg2png-converter`
- **PDF Export:** `html-pdf`
- **3D Visualization (optional):** `three.js`
- **Utility Libraries:** `clsx`, `class-variance-authority`, `tailwind-merge`, `tailwindcss-animate`

## Contributing
Contributions are welcome! Feel free to open an issue or submit a pull request.



