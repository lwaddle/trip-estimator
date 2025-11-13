# Trip Estimator

**Trip Estimator** is a web app for estimating dry lease trip costs in private aircraft operations.
Powered by Cloudflare Pages, D1 Database, and Zero Trust authentication for secure, multi-device access to your trip estimates.

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
- **Save & Load estimates** - All estimates stored securely in Cloudflare D1
- **Auto-save** - Automatic backup every 2 minutes
- **Multi-device sync** - Access your estimates from any browser
- **Export/Import** - JSON export for backup and sharing
- **Cloudflare Zero Trust** - Secure email-based authentication

---

## 💻 Usage

### For End Users

1. Navigate to your deployed Trip Estimator URL
2. Authenticate with your authorized email address (via Cloudflare Zero Trust)
3. Enter your trip legs and cost parameters
4. Estimates are automatically saved every 2 minutes
5. Use **Save** to create named estimates
6. Use **Load** to access previously saved estimates
7. Use **Copy Summary** to share results
8. Use **Export** to download estimates as JSON files

### For Developers

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete setup and deployment instructions.

---

## 📂 Project Structure

```text
trip-estimator/
├── index.html                           # Main application HTML
├── script.js                            # Application logic with API integration
├── styles.css                           # Application styles
├── functions/
│   └── api/
│       └── estimates/
│           └── [[route]].js             # Pages Functions API endpoints
├── migrations/
│   └── 0001_initial_schema.sql          # D1 database schema
├── wrangler.toml                        # Cloudflare configuration
├── DEPLOYMENT.md                        # Deployment guide
├── LICENSE                              # MIT License
└── README.md                            # This file
```

---

## 🧱 Tech Stack

**Frontend:**
- HTML5 + CSS3 + Vanilla JavaScript
- No external libraries or frameworks
- Responsive design for desktop and mobile

**Backend:**
- Cloudflare Pages Functions (serverless API)
- Cloudflare D1 (SQLite database)
- Cloudflare Zero Trust (authentication)

**Infrastructure:**
- Deployed on Cloudflare Pages
- Global CDN with edge computing
- Zero-maintenance serverless architecture

---

## 🚀 Future Enhancements

- Printable PDF output
- Estimate sharing between users
- Destination-based crew rate presets
- Estimate history and versioning
- Cost trend analysis and reporting  

---

## 🪪 License

This project is licensed under the [MIT License](LICENSE).  
© 2025 Loren Waddle.

---

## 🧭 Inspiration

Built to simplify pre-trip cost planning for dry lease operations —  
especially when pulling times and fuel data manually from ForeFlight.