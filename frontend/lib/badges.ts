function getBadgeForLevel(skillLevel: string): string {
  const map: Record<string, string> = {
    beginner: "Bronze",
    intermediate: "Silver",
    advanced: "Gold",
  };
  return map[skillLevel] ?? "Bronze";
}

export { getBadgeForLevel };