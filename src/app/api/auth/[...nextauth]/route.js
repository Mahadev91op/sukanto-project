import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        await connectToDatabase();
        
        // 1. Pura data sirf aur sirf .env se liya jayega (Koi default text nahi)
        const envAdminUser = process.env.ADMIN_USERNAME;
        const envAdminPass = process.env.ADMIN_PASSWORD;

        // Agar galti se .env me data set karna bhul gaye, toh error aayega
        if (!envAdminUser || !envAdminPass) {
          throw new Error("Server Error: .env file me ADMIN_USERNAME ya ADMIN_PASSWORD set nahi hai!");
        }

        // 2. Pehle check karo ki kya ye Admin hai (Seedha .env se)
        if (credentials.username === envAdminUser && credentials.password === envAdminPass) {
          return { id: "admin_id_env", name: envAdminUser, role: "admin" };
        }

        // 3. Agar admin nahi hai, toh database me doosre users dhundo (Staff ke liye)
        const user = await User.findOne({ username: credentials.username });
        
        if (!user) {
          throw new Error("User nahi mila ya password galat hai.");
        }

        // 4. Agar user database me mil gaya, toh password match karo
        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error("Galat password!");
        }

        // Sab sahi hai toh user details return karo
        return { id: user._id.toString(), name: user.username, role: user.role };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role;
      session.user.id = token.id;
      return session;
    }
  },
  pages: {
    signIn: "/login", 
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };