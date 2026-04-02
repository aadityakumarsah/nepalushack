import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";
import { currentUser } from "@clerk/nextjs/server";
import { UserButton, SignInButton } from "@clerk/nextjs";

const Layout = async ({ children }: { children: ReactNode }) => {
  const user = await currentUser();

  return (
    <div className="root-layout">
      <nav>
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="MockMate Logo" width={38} height={32} />
          <h2 className="text-primary-100">PrepWise</h2>
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10",
                },
              }}
            />
          ) : (
            <SignInButton mode="modal">
              <button className="btn-primary px-4 py-2 rounded-full text-sm cursor-pointer">
                Sign In
              </button>
            </SignInButton>
          )}
        </div>
      </nav>

      {children}
    </div>
  );
};

export default Layout;
