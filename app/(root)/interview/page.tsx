import Agent from "@/components/Agent";

const Page = async () => {
  // Use a default user since auth is removed
  const user = {
    name: "User",
    id: "default-user",
  };

  return (
    <>
      <h3>Interview generation</h3>

      <Agent userName={user.name} userId={user.id} type="generate" />
    </>
  );
};

export default Page;
