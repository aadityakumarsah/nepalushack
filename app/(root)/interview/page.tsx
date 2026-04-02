import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";

import InterviewForm from "@/components/InterviewForm";

const Page = async () => {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="text-2xl font-bold">New Interview</h3>
        <p className="text-light-100 mt-1">
          Set up your mock interview and choose your AI interviewer persona.
        </p>
      </div>

      <InterviewForm userId={clerkUser.id} />
    </div>
  );
};

export default Page;
