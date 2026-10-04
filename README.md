# CityQR 🌆

### Turn QR Codes into a 3D City

**CityQR** is a browser-based QR Code Generator & Designer that transforms a generated QR code into an interactive **3D city visualization**.

Instead of displaying a QR code as a simple flat matrix, CityQR visualizes its structure as a miniature city and then transitions back into the final scannable QR code.

🔗 **Live Demo:** https://city-qr.vercel.app

---

## ✨ Features

* 🌆 **Interactive 3D City**

  * Explore the generated QR through an interactive miniature city.
  * Rotate the city horizontally.
  * Zoom in and out of the scene.
  * Designed to work with both mouse and touch interaction.

* 🔳 **QR Code Generation**

  * Generate QR codes for:

    * URL
    * Plain Text
    * Wi-Fi
  * Customize QR size and quiet zone.
  * Generate the QR only when the **Generate** action is triggered.

* 🎨 **3D City Visualization**

  * QR matrix data drives the spatial structure of the city.
  * Buildings, roads, open areas, and residential structures form the visual interpretation of the QR.
  * Colorful architectural elements and Japanese-inspired residential houses create visual variety.
  * Windows and architectural details are selectively distributed throughout the city.

* 🔄 **City → QR Transition**

  * Interact with the city and reveal the corresponding flat QR code.
  * The final QR maintains the same underlying QR data and matrix structure.

* 🖼️ **Center Content**

  * Add optional content to the center of the QR.
  * Supports text and image-based center content while maintaining QR usability.

* 🕘 **Recent QR Codes**

  * Previously generated QR codes can be accessed through the recent QR history.
  * Recent data is stored locally in the browser.

* 📱 **Responsive & Mobile-Friendly**

  * Designed for desktop and mobile browsers.
  * Touch interaction supports city rotation, zooming, and tapping.
  * Rendering is optimized to provide a smoother experience on mobile devices.

* 📥 **QR Export**

  * Download generated QR codes for use outside the application.

---

## 🛠️ Tech Stack

* **React**
* **TypeScript**
* **Vite**
* **Three.js**
* **CSS**
* **qrcode** / QR generation utilities
* **Local Storage** for recent QR persistence
* **Vercel** for deployment

---

## 🎮 Controls

### Desktop

| Action      | Interaction               |
| ----------- | ------------------------- |
| Rotate City | Click + drag horizontally |
| Zoom        | Scroll                    |
| Reveal QR   | Click the city            |
| Generate QR | Generate button           |

### Mobile

| Action      | Interaction      |
| ----------- | ---------------- |
| Rotate City | One-finger drag  |
| Zoom        | Two-finger pinch |
| Reveal QR   | Tap              |
| Generate QR | Generate button  |

Dragging the city is distinguished from a simple click/tap so that rotating the scene does not accidentally trigger the QR transition.

---

## 🧩 QR Types

CityQR currently supports:

### URL

Generate a QR code containing a website URL.

### Plain Text

Generate a QR code containing any text.

### Wi-Fi

Generate a QR code containing Wi-Fi network information.

---

## 📂 Project Structure

```text
cityQR/
├── public/
│   ├── favicon.svg
│   └── icons.svg
│
├── src/
│   ├── components/
│   │   ├── CityScene.tsx
│   │   ├── QRControls.tsx
│   │   └── RecentQRs.tsx
│   │
│   ├── types/
│   │   └── qr.ts
│   │
│   ├── utils/
│   │   ├── qrGenerator.ts
│   │   └── storage.ts
│   │
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
│
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🚀 Run Locally

Clone the repository:

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
```

Navigate into the project:

```bash
cd cityQR
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The application will be available at the local development URL provided by Vite.

---

## 📦 Production Build

To create a production build:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

---

## 🌐 Live Deployment

CityQR is deployed using **Vercel**.

**Live Website:**
https://city-qr.vercel.app

The project is connected to its GitHub repository, allowing future changes to be built and deployed through the repository workflow.

---

## 💡 Concept

Traditional QR generators treat a QR code as a flat collection of black and white modules.

CityQR explores a different approach:

> **What if the QR code itself could become a city?**

The QR matrix acts as the foundation for the 3D visualization. The city provides an interactive representation of the underlying QR structure before transitioning into the familiar flat, scannable QR code.

This combines **generative visualization, 3D interaction, and practical QR generation** into a single browser-based experience.

---

## 🔐 Privacy

CityQR is designed as a client-side web application.

Generated QR information and recent QR history are handled within the browser. No account is required to use the application.

---

## 👨‍💻 Project

**CityQR**
An interactive 3D QR Code Generator & Designer.

🔗 **Live:** https://city-qr.vercel.app
