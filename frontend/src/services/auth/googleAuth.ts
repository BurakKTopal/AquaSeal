/**
 * Google OAuth Authentication Service
 * Provides Google Sign-In as an alternative to wallet connection
 */

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

class GoogleAuthService {
  private clientId: string;
  private isInitialized: boolean = false;

  constructor() {
    // Get Google Client ID from environment or use a default for testing
    this.clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  }

  /**
   * Initialize Google OAuth
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (!this.clientId) {
      console.warn('[GoogleAuth] No VITE_GOOGLE_CLIENT_ID found. Google login will be disabled.');
      return;
    }

    // Load Google Identity Services script
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Google Auth requires browser environment'));
        return;
      }

      // Check if script already loaded
      if ((window as any).google?.accounts) {
        this.isInitialized = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: this.clientId,
            callback: () => {}, // Will be handled by individual methods
          });
          this.isInitialized = true;
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      script.onerror = () => {
        reject(new Error('Failed to load Google Identity Services script'));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Sign in with Google
   */
  async signIn(): Promise<GoogleUser> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.clientId) {
      throw new Error('Google Client ID not configured. Please set VITE_GOOGLE_CLIENT_ID in your .env file.');
    }

    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !(window as any).google?.accounts) {
        reject(new Error('Google Identity Services not loaded'));
        return;
      }

      (window as any).google.accounts.oauth2.initTokenClient({
        client_id: this.clientId,
        scope: 'openid profile email',
        callback: async (response: any) => {
          if (response.error) {
            reject(new Error(response.error));
            return;
          }

          try {
            // Get user info using the access token
            const userInfo = await this.getUserInfo(response.access_token);
            resolve(userInfo);
          } catch (error: any) {
            reject(error);
          }
        },
      }).requestAccessToken();
    });
  }

  /**
   * Get user info from Google API
   */
  private async getUserInfo(accessToken: string): Promise<GoogleUser> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info from Google');
    }

    const data = await response.json();
    return {
      id: data.id,
      email: data.email,
      name: data.name,
      picture: data.picture,
    };
  }

  /**
   * Sign in with Google using One Tap (simpler flow)
   */
  async signInWithOneTap(): Promise<GoogleUser> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.clientId) {
      throw new Error('Google Client ID not configured. Please set VITE_GOOGLE_CLIENT_ID in your .env file.');
    }

    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !(window as any).google?.accounts) {
        reject(new Error('Google Identity Services not loaded'));
        return;
      }

      (window as any).google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Fallback to regular sign in
          this.signIn().then(resolve).catch(reject);
          return;
        }

        if (notification.isDismissedMoment()) {
          reject(new Error('Google sign-in was dismissed'));
          return;
        }
      });

      // Listen for credential response
      (window as any).google.accounts.id.initialize({
        client_id: this.clientId,
        callback: async (response: any) => {
          try {
            // Decode the credential to get user info
            const userInfo = await this.decodeCredential(response.credential);
            resolve(userInfo);
          } catch (error: any) {
            reject(error);
          }
        },
      });
    });
  }

  /**
   * Decode Google credential JWT
   */
  private async decodeCredential(credential: string): Promise<GoogleUser> {
    // Simple JWT decode (just get payload)
    const parts = credential.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid credential format');
    }

    const payload = JSON.parse(atob(parts[1]));
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };
  }

  /**
   * Check if Google Auth is available
   */
  isAvailable(): boolean {
    return !!this.clientId && this.isInitialized;
  }
}

export const googleAuthService = new GoogleAuthService();

