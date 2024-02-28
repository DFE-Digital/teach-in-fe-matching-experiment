export function parseCandidateEmailHtml(emailContent: string) {
  const results = [];

  const candidateParts = [
    ...emailContent
      .replace(/[\r\n]/g, "")
      .matchAll(
        /Potential teacher in ([^<]+)<(.*?)(?=Potential teacher in|$)/gm,
      ),
  ];

  for (const part of candidateParts) {
    const items = [
      ...part[2].matchAll(/<dt[^>]*>([^<]*)<\/dt>\s*<dd[^>]*>(.*?)<\/dd>/gm),
    ];

    const itemDict = {};

    for (const item of items) {
      itemDict[item[1]] = item[2];
    }

    const result = {
      subject: part[1],
      name: itemDict["Name"],
      email: itemDict["Email address"],
      colleges: itemDict["Colleges they have matched with"]
        .split(",")
        .map((s) => s.trim()),
      subject2: itemDict["Specialism"],
      qualification: itemDict["Highest qualification level in subject"],
      experience: itemDict["Years of experience in subject"],
      availability: itemDict["Hours of teaching they are interested in"],
    };

    results.push(result);
  }

  return results;
}
