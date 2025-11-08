# Trip Estimator

**Trip Estimator** is a lightweight single-page web app for estimating dry lease trip costs in private aircraft operations.  
It’s designed for simplicity — all client-side, no dependencies, and fast enough to run offline in a browser.

---

## ✈️ Features

- Add multiple flight legs with time (`HH:MM`) and fuel burn (`lb`)
- Automatic conversion between **pounds and gallons** (configurable Jet-A density)
- Real-time cost breakdown by:
  - Hourly maintenance programs and reserves  
  - Fuel and uplift percentage  
  - Crew per-diem, hotels, meals, and transportation  
  - Airport and handling fees  
  - Miscellaneous / indirect costs  
- Instant totals for:
  - **Cost per hour**  
  - **Cost per leg**  
  - **Pre-tax and grand total**  
- **Copy summary** button for quick text/email sharing  
- Works entirely in the browser — no backend or login required

---

## 💻 Usage

1. Clone or download the repository.
2. Open `trip-estimator.html` in any modern web browser.
3. Enter your trip legs and cost parameters.
4. Click **Calculate** to see the breakdown.
5. Optionally use **Copy Summary** to share the results.

> For now, all data is local and ephemeral.  
> Future versions may support saving trips and user authentication.

---

## 📂 Project Structure

```text
trip-estimator/
├── trip-estimator.html   # Complete self-contained app
├── LICENSE               # MIT License
└── README.md             # This file
```

---

## 🧱 Tech Stack

- **HTML5 + CSS3 + Vanilla JavaScript**
- No external libraries or frameworks
- Works seamlessly on Cloudflare Pages, GitHub Pages, or any static host

---

## 🚀 Planned Enhancements

- Local storage for saving recent trips  
- Printable PDF output  
- Destination-based crew rate presets  
- Cloudflare Access login and D1 database integration  

---

## 🪪 License

This project is licensed under the [MIT License](LICENSE).  
© 2025 Loren Waddle.

---

## 🧭 Inspiration

Built to simplify pre-trip cost planning for dry lease operations —  
especially when pulling times and fuel data manually from ForeFlight.