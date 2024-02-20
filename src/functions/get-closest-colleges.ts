import "dotenv/config";
import { getAllColleges } from "../qualtrics/college-service";
import { app } from "@azure/functions";

const radiusMiles = 40;

app.http("get-closest-colleges", {
    methods: ["POST"],
    authLevel: "function",
    handler: async (request, console) => {
        const requestData: any = await request.json();

        const candidateLat = requestData.lat; //51.496351
        const candidateLong = requestData.long; // -0.087925

        // get the closest colloges to the candidate by using their lat/long
        const reachableColleges = await getClosestColleges(
            candidateLat,
            candidateLong,
        );

        // sort colleges by distance
        const orderedReachableColleges = reachableColleges.sort(
            (a, b) => a.distance - b.distance,
        );

        return { body: JSON.stringify({ ...requestData, nearestColleges: orderedReachableColleges }) };
    },
});

async function getClosestColleges(candidateLat, candidateLong) {
    const closestColleges: any[] = [];

    const allColleges = await getAllColleges();

    for (const college of allColleges) {
        const collegeLat = college.embeddedData!.lat!;
        const collegeLong = college.embeddedData!.long!;
        const extRef = college.extRef;
        const collegeGroupId = college.embeddedData?.groupId;

        const R = 3959; // Radius of the earth in miles
        const dLat = deg2rad(collegeLat - candidateLat); // deg2rad below
        const dLon = deg2rad(collegeLong - candidateLong);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(candidateLat)) *
            Math.cos(deg2rad(collegeLat)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c;
        if (d < radiusMiles) {
            const currentDistance = {
                collegeId: extRef,
                distance: d,
                collegeGroupId: collegeGroupId,
            };
            closestColleges.push(currentDistance);
        }
    }

    return closestColleges;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}
