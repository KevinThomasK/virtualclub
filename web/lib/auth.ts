import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import {
  DEFAULT_OUTFIT,
  isValidAccentColor,
  isValidOutfitId,
  resolveOutfit,
  type AvatarOutfit,
} from "@/lib/avatarCatalog";

export type { AvatarOutfit };

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      gender: string;
      color: string;
      shirt: string;
      pants: string;
      shoes: string;
      style: string;
    };
  }

  interface User {
    id: string;
    name: string;
    gender: string;
    color: string;
    shirt: string;
    pants: string;
    shoes: string;
    style: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    gender: string;
    color: string;
    shirt: string;
    pants: string;
    shoes: string;
    style: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Guest",
      credentials: {
        name: { label: "Display name", type: "text" },
        gender: { label: "Gender", type: "text" },
        color: { label: "Accent color", type: "text" },
        shirt: { label: "Shirt", type: "text" },
        pants: { label: "Pants", type: "text" },
        shoes: { label: "Shoes", type: "text" },
        style: { label: "Style", type: "text" },
      },
      authorize(credentials) {
        const name = credentials?.name?.trim();
        if (!name) return null;

        const outfit = resolveOutfit({
          gender: isValidOutfitId("gender", credentials?.gender)
            ? credentials!.gender
            : DEFAULT_OUTFIT.gender,
          color: isValidAccentColor(credentials?.color)
            ? credentials!.color
            : DEFAULT_OUTFIT.color,
          shirt: isValidOutfitId("shirt", credentials?.shirt)
            ? credentials!.shirt
            : DEFAULT_OUTFIT.shirt,
          pants: isValidOutfitId("pants", credentials?.pants)
            ? credentials!.pants
            : DEFAULT_OUTFIT.pants,
          shoes: isValidOutfitId("shoes", credentials?.shoes)
            ? credentials!.shoes
            : DEFAULT_OUTFIT.shoes,
          style: isValidOutfitId("style", credentials?.style)
            ? credentials!.style
            : DEFAULT_OUTFIT.style,
        });

        return {
          id: crypto.randomUUID(),
          name,
          ...outfit,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.gender = user.gender;
        token.color = user.color;
        token.shirt = user.shirt;
        token.pants = user.pants;
        token.shoes = user.shoes;
        token.style = user.style;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.name = token.name ?? session.user.name ?? "Guest";
      session.user.gender = token.gender ?? DEFAULT_OUTFIT.gender;
      session.user.color = token.color ?? DEFAULT_OUTFIT.color;
      session.user.shirt = token.shirt ?? DEFAULT_OUTFIT.shirt;
      session.user.pants = token.pants ?? DEFAULT_OUTFIT.pants;
      session.user.shoes = token.shoes ?? DEFAULT_OUTFIT.shoes;
      session.user.style = token.style ?? DEFAULT_OUTFIT.style;
      return session;
    },
  },
};
