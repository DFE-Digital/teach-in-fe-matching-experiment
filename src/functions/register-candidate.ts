import "dotenv/config";
import config from "../config";
import { getAllColleges } from "../qualtrics/college-service";
import { CollegeGroup } from "../types";
import {
    createOrUpdateCollegeGroup,
    getAllCollegeGroups,
    updateCollegeGroupById,
} from "../qualtrics/college-group-service";
import {
    getCandidateByEmail,
    updateCandidate,
} from "../qualtrics/candidate-service";
import { app } from "@azure/functions";
import axios from "axios";
import urls from "./urls";

const radiusMiles = 40;
const radiusKm = radiusMiles * 1.609;

app.http("register-candidate", {
    methods: ["POST"],
    authLevel: "function",
    handler: async (request, console) => {
        const requestData: any = await request.json();

        const candidateLat = requestData.lat; //51.496351
        const candidateLong = requestData.long; // -0.087925
        const candidateRegion = requestData.region;
        const candidate = await getCandidateByEmail(requestData.email);

        // load all subscribed college-groups data from qualtrics to local list
        const collegeGroups = (await getAllCollegeGroups()).filter(
            (collegeGroup) => !collegeGroup.unsubscribed,
        );
        const collegeGroupsByExtRef: { [key: string]: CollegeGroup } = {};
        collegeGroups.forEach(
            (collegeGroup) =>
                (collegeGroupsByExtRef[collegeGroup.extRef] = collegeGroup),
        );

        // get the closest colloges to the candidate by using their lat/long
        const reachableColleges = await getClosestColleges(
            candidateLat,
            candidateLong,
        );

        // sort colleges by distance
        const orderedReachableColleges = reachableColleges.sort(
            (a, b) => a.distance - b.distance,
        );

        const matches = [];

        for (const college of orderedReachableColleges) {
            // Have we found the group before?
            const existingMatch = matches.find(
                (match) => match.collegeGroupId == college.collegeGroupId,
            );

            if (existingMatch) {
                existingMatch.colleges.push(college.collegeId);
            } else {
                matches.push({
                    collegeGroupId: college.collegeGroupId,
                    colleges: [college.collegeId],
                });
            }
        }

        candidate.embeddedData.matched = matches.length > 0;
        candidate.embeddedData.lat = candidateLat;
        candidate.embeddedData.long = candidateLong;
        candidate.embeddedData.region = candidateRegion;

        for (let i = 0; i < Math.min(matches.length, 5); ++i) {
            candidate.embeddedData[`collegeGroup${i + 1}Id`] =
                matches[i].collegeGroupId;
            candidate.embeddedData[`collegeGroup${i + 1}Colleges`] =
                matches[i].colleges.join(",");

            const collegeGroup =
                collegeGroupsByExtRef[matches[i].collegeGroupId];

            if (collegeGroup.embeddedData.groupStatus == "Unregistered") {
                const updatedCollegeGroup: CollegeGroup = {
                    embeddedData: {
                        groupStatus: "NeedsInvite",
                    },
                };

                await updateCollegeGroupById(
                    collegeGroup.contactId,
                    updatedCollegeGroup,
                );
            }
        }

        updateCandidate(candidate);

        if (matches.length == 0) {
            const currentEmail = {
                email: candidate.email,
                firstName: candidate.firstName,
                subject: "",
                body: "",
                key: config.emailSendWorkflowKey,
            };
            await axios.post(urls.invokeInviteNoMatchWorkflow(), currentEmail);
        }

        return { body: JSON.stringify(orderedReachableColleges) };
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

        const R = 6371; // Radius of the earth in km
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
        if (d < radiusKm) {
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
