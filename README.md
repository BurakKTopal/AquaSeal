# AquaSeal

A decentralized intellectual property protection platform that combines steganographic watermarking with blockchain-based proof-of-ownership. AquaSeal enables creators to secure their digital assets and prove authenticity in a trustless, verifiable way.

## Overview

AquaSeal is a full-stack Web3 application that embeds invisible, robust watermarks into digital content (images, audio files, and PDFs) and registers them as Intellectual Property NFTs on the CAMP network. This creates an immutable, on-chain proof-of-ownership record that survives compression, resizing, and format conversion.

## Key Features

- **Multi-Format Watermarking**: Supports images (invisible steganographic), MP3 audio (metadata-based), and PDFs (visual + metadata)
- **Blockchain Integration**: IpNFT minting via CAMP Origin SDK with on-chain proof storage
- **Decentralized Verification**: Watermark extraction and blockchain validation without central authority
- **Modern Web3 UI**: React-based interface with Web3 wallet support

## Technical Stack

### Backend
- **Python 3.11** with FastAPI
- **Watermarking Libraries**: invisible-watermark, mutagen, reportlab, pypdf
- **Deployment**: Docker, Railway

### Frontend
- **React 18+** with TypeScript
- **Build Tool**: Vite
- **Web3**: Origin SDK, Wagmi, Viem
- **Deployment**: Vercel

### Blockchain
- **CAMP Network** with IpNFT standard
- **Origin SDK** for client-side minting
- **The Graph Protocol** for subgraph queries

## Architecture

The application follows a modular architecture:

- **Backend**: RESTful API with separate services for watermarking, verification, and file handling
- **Frontend**: Component-based React architecture with custom hooks for Web3 interactions
- **Blockchain Layer**: Client-side NFT minting with metadata storage on-chain

## API Endpoints

- `POST /api/v1/upload` - Upload and watermark files
- `POST /api/v1/verify` - Verify watermark authenticity
- `POST /api/v1/extract` - Extract watermark from files
- `GET /api/v1/download/{filename}` - Download watermarked files

## Deployment

- **Backend**: [Railway](https://aquaseal-production.up.railway.app)
- **Frontend**: [Vercel](https://aquaseal-frontend.vercel.app)

## Use Cases

- Digital creators protecting intellectual property
- NFT marketplaces verifying authenticity
- Media companies detecting unauthorized usage
- Legal/IP services securing creation evidence

## Future Enhancements

- Video watermarking support
- Batch processing capabilities
- Enhanced watermark algorithms
- Multi-chain support
- Marketplace integration for IP trading
