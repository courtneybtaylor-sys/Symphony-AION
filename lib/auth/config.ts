/**
 * NextAuth Configuration
 * Phase 4a: Authentication with credentials provider
 * Task 8: OAuth providers (Google, GitHub) and audit logging
 * Super-admin support with RBAC
 */

import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import bcrypt from 'bcryptjs';
import { logSuccessfulLogin, logFailedLogin } from '@/lib/audit-logger';
import { isEmailSuperAdmin, promoteToSuperAdmin } from '@/lib/rbac';

export const authOptions: NextAuthOptions = {
  providers: [
    // Credentials provider (email/password)
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        try {
          // Dynamically import and get Prisma client only when needed
          const { getPrisma } = await import('@/lib/db');
          const prisma = await getPrisma();

          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user || !user.password) {
            throw new Error('Invalid email or password');
          }

          const isValid = await bcrypt.compare(credentials.password, user.password);

          if (!isValid) {
            throw new Error('Invalid email or password');
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } catch (error: any) {
          console.error('[Auth] Authorization error:', error.message);
          throw new Error('Authentication failed. Please try again later.');
        }
      },
    }),

    // Task 8: Google OAuth provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: false,
    }),

    // Task 8: GitHub OAuth provider
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      allowDangerousEmailAccountLinking: false,
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    error: '/login?error=auth-failed',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Task 8: Audit logging for OAuth signins
      if (account && account.provider !== 'credentials' && user.email) {
        try {
          // Log OAuth signin
          await logSuccessfulLogin(user.id || '', '', '', account.provider);
        } catch {
          // Don't fail auth due to logging issues
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;

        // Check if user should be a super-admin
        if (isEmailSuperAdmin(user.email || '')) {
          try {
            await promoteToSuperAdmin(user.email || '');
            token.role = 'super_admin';
          } catch {
            // Ignore promotion errors
          }
        } else {
          // Fetch current role from DB
          try {
            const { default: getPrisma } = await import('@/lib/db');
            const prisma = await getPrisma();
            const dbUser = await prisma.user.findUnique({
              where: { id: user.id },
              select: { role: true },
            });
            token.role = dbUser?.role || 'user';
          } catch {
            token.role = 'user';
          }
        }
      }
      if (account) {
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string; provider?: string; role?: string }).id = token.id as string;
        (session.user as { id?: string; provider?: string; role?: string }).provider = token.provider as string;
        (session.user as { id?: string; provider?: string; role?: string }).role = token.role as string;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Only allow redirects to same origin for security
      if (url.startsWith('/')) return url;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'development-secret-change-in-production',
  events: {
    async signIn({ user, account }) {
      // Task 8: Log all signin events
      if (user.id && account?.provider === 'credentials') {
        try {
          await logSuccessfulLogin(user.id, '', '', 'credentials');
        } catch {
          // Ignore logging errors
        }
      }
    },
    async signOut() {
      // Task 8: Log signout events
      // (requires request context from middleware)
    },
  },
};
