# **AquaSeal – IP Protection Platform**

## **Vision**
AquaSeal is a decentralized intellectual property protection platform that merges steganographic watermarking with blockchain-based proof-of-ownership. It enables creators to secure their digital assets and prove authenticity in a trustless, verifiable way.

## **What We Built**
AquaSeal is a full-stack Web3 application that embeds invisible, robust watermarks into digital content—images, audio files, and PDFs—and registers them as Intellectual Property NFTs on the CAMP network. This creates an immutable, on-chain proof-of-ownership record.

## **Core Innovation**
Traditional watermarking is easy to remove or tamper with. AquaSeal embeds invisible watermarks that survive compression, resizing, and format conversion. Ownership is registered on-chain via CAMP IpNFTs, which store the watermark hash as metadata. Anyone can verify authenticity without relying on a central authority.  
Supports images, audio, and PDFs.

## **Key Features**

### **Multi-Format Watermarking**
- **Images:** Invisible steganographic watermarks resilient to compression  
- **Audio MP3:** Metadata-based watermarking embedded in ID3 tags  
- **PDFs:** Visual logo watermarks plus metadata-based protection  

### **Blockchain Integration**
- **CAMP Network Integration:** IpNFT minting via Origin SDK  
- **On-Chain Proof:** Watermark hash stored as NFT metadata  
- **Decentralized Verification:** CAMP subgraph used for authenticity checks  

### **User Interface**
- Modern React UI with TypeScript and Vite  
- Web3 wallet support (MetaMask, EVM wallets)  
- Real-time watermarking and verification feedback  

### **Verification System**
- Watermark extraction and blockchain validation  
- Tamper detection for altered or missing watermarks  
- Ownership proof tied to on-chain IpNFT records  

## **Technical Architecture**

### **Backend**
- Python FastAPI with modular design  
- Multiple watermarking algorithms:  
  - `invisible-watermark` for images  
  - custom MP3 watermarking via `mutagen`  
  - PDF watermarking using `reportlab` + `pypdf`  
- REST API for upload, verify, extract  
- Dockerized with multi-stage builds  
- Optimized for Railway deployment (<8GB)

### **Frontend**
- React 18+ with TypeScript and Vite  
- Origin SDK for CAMP network NFT minting  
- Wagmi + Viem for wallet and blockchain interactions  
- Responsive UI for desktop and mobile  

### **Blockchain Layer**
- CAMP IpNFT standard  
- Origin SDK for client-side minting with watermark metadata  
- Verification via The Graph subgraph queries  

## **Use Cases**
- Creators: photographers, musicians, digital artists  
- Digital publishers tracking document distribution  
- NFT marketplaces verifying authenticity  
- Legal/IP services securing creation evidence  
- Media companies detecting unauthorized usage  

## **Tech Stack**

### **Backend**
- Python 3.11  
- FastAPI  
- invisible-watermark, mutagen, reportlab, pypdf  
- Docker  
- Railway  

### **Frontend**
- React 18+  
- TypeScript  
- Vite  
- Origin SDK  
- Axios  

### **Blockchain**
- CAMP Network  
- Origin SDK  
- The Graph Protocol  
- EVM-compatible wallets  

## **API Endpoints**
- **POST** `/api/v1/upload` – Upload and watermark  
- **POST** `/api/v1/verify` – Verify watermark  
- **POST** `/api/v1/extract` – Extract watermark  
- **GET** `/api/v1/download/{filename}` – Download watermarked file  

## **Deployment**
- Backend: `https://aquaseal-production.up.railway.app`  
- Frontend: `https://aquaseal-frontend.vercel.app`  

## **Future Enhancements**
- Video watermarking  
- Batch processing  
- More robust watermark algorithms  
- Multi-chain support  
- Marketplace integration for IP trading  
