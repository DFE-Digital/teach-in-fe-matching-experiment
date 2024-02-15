import "dotenv/config";
import config from "../config";
import { getAllColleges } from "../qualtrics/college-service";
import { Contact } from "../types";
const { app } = require("@azure/functions");
const axios = require("axios");
const urls = require("./urls");
const collegeGroupService = require("../qualtrics/college-group-service");

const radiusMiles = 40;
const radiusKm = radiusMiles * 1.609;

app.http("register-candidate", {
    methods: ["POST"],
    authLevel: "function",
    handler: async (request, console) => {
        const requestData = await request.json();

        const candidateLat = requestData.lat; //51.496351
        const candidateLong = requestData.long; // -0.087925
        const candidateRegion = requestData.region; 
        const candidateContact: Contact = await getCandidateContact(
            requestData.email,
        );

        // load all collge-groups data from qualtrics to local list
        let collegeGroups = await collegeGroupService.getAllCollegeGroups();

        // get the closest colloges to the candidate by using their lat/long
        let reachableColleges = await getClosestColleges(
            candidateLat,
            candidateLong,
            collegeGroups,
        );

        // sort colleges by distance
        let ordredReachableColleges = reachableColleges.sort(
            (a, b) => a.distance - b.distance,
        );
        
        let collegeIds: any[] = [];
        if (
            ordredReachableColleges != undefined &&
            ordredReachableColleges.length > 0
        ) {
            let chosenGroupIds: any[] = [];
            let waitingListGroup: any[] = [];
            let collegeCount = 0;
            for (let i = 0; i < ordredReachableColleges.length; i++) {
                if (collegeCount < 5) {
                    // do the following until we get to 5 colleges
                    if (
                        !hasGroupChosenBefore(
                            chosenGroupIds,
                            ordredReachableColleges[i].collegeGroupId,
                        )
                    ) {
                        collegeIds.push(ordredReachableColleges[i].collegeId);
                        chosenGroupIds.push(
                            ordredReachableColleges[i].collegeGroupId,
                        );
                        collegeCount++;
                    } else {
                        waitingListGroup.push({
                            collegeGroupId:
                                ordredReachableColleges[i].collegeGroupId,
                            collegeId: ordredReachableColleges[i].collegeId,
                            distance: ordredReachableColleges[i].distance,
                        });
                    }
                }
            }
            if (collegeCount < 5 && waitingListGroup.length > 0) {
                for (let k = 0; k < waitingListGroup.length; k++) {
                    if (collegeCount < 5) {
                        collegeIds.push(waitingListGroup[k].collegeId);
                        collegeCount++;
                    }
                }
            }

            await setCollegeGroupToNeedsInvite(
                collegeGroups,
                chosenGroupIds,
            );
        }

        await assignToCollege(
            collegeIds,
            candidateContact,
            candidateLat,
            candidateLong,
            candidateRegion,
        );

        return { body: JSON.stringify(ordredReachableColleges) };
    },
});

function hasGroupChosenBefore(chosenGroups, groupId) {
    if (chosenGroups.length > 0) {
        for (let i = 0; i < chosenGroups.length; i++) {
            if (chosenGroups[i] == groupId) return true;
        }
    }
    return false;
}

async function getClosestColleges(candidateLat, candidateLong, collegeGroups) {
    const closestColleges: any[] = [];

    const allColleges = await getAllColleges();

    for (const college of allColleges) {
        const collegeLat = college.embeddedData!.lat!;
        const collegeLong = college.embeddedData!.long!;
        const extRef = college.extRef;
        const collegeGroupId = college.embeddedData?.groupId;

        if (isSubscribed(collegeGroups, collegeGroupId)) {
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
    }

    return closestColleges;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

function isSubscribed(collegeGroups, collegeGroupId) {
    if (collegeGroups.length > 0) {
        for (let i = 0; i < collegeGroups.length; i++) {
            if (collegeGroups[i].extRef == collegeGroupId
                && !collegeGroups[i].unsubscribed) 
            return true;
        }
    }
    return false;
}

async function assignToCollege(
    collegeIds: any,
    candidateContact: Contact,
    candidateLat: string,
    candidateLong: string,
    candidateRegion: string,
) {
    let college1Id = "";
    let college2Id = "";
    let college3Id = "";
    let college4Id = "";
    let college5Id = "";
    let matchedValue = false;
    for (let j = 0; j < collegeIds.length; j++) {
        switch (j) {
            case 0:
                college1Id = collegeIds[j];
                break;
            case 1:
                college2Id = collegeIds[j];
                break;
            case 2:
                college3Id = collegeIds[j];
                break;
            case 3:
                college4Id = collegeIds[j];
                break;
            case 4:
                college5Id = collegeIds[j];
                break;

            default:
                break;
        }
        matchedValue = true;
    }
    let current_candidate = {
        embeddedData: {
            matched: matchedValue,
            college1Id: college1Id,
            college2Id: college2Id,
            college3Id: college3Id,
            college4Id: college4Id,
            college5Id: college5Id,
            lat: candidateLat,
            long: candidateLong,
            rigion: candidateRegion,
        },
    };
    const update_candidate_URL =
        urls.updateCandidate() + "/" + candidateContact.contactId;
    await axios
        .put(update_candidate_URL, current_candidate, {
            headers: urls.qualtricsHeader(),
        })
        .then((response) => {
            console.log(`SUCCESS`);
        })
        .catch((error) => {
            console.log(`Error when trying to update candidate: "${error}" `);
        });

    if (!matchedValue) {
        const currentEmail = {
            email: candidateContact.email,
            firstName: candidateContact.firstName,
            subject: "",
            body: "",
            key: config.emailSendWorkflowKey,
        };
        await axios.post(urls.invokeInviteNoMatchWorkflow(), currentEmail);
    }
}

async function setCollegeGroupToNeedsInvite(
    collegeGroups,
    chosenGroupIds,
) {

    for (let i = 0; i < collegeGroups.length; i++) {
        if (
            chosenGroupIds.includes(collegeGroups[i].extRef) &&
            collegeGroups[i].embeddedData.groupStatus == "Unregistered"
        ) {
            let current_college = {
                embeddedData: {
                    groupStatus: "NeedsInvite",
                },
            };
            const update_college_URL =
                urls.updateCollegeGroup() + "/" + collegeGroups[i].contactId;
            await axios.put(update_college_URL, current_college, {
                headers: urls.qualtricsHeader(),
            });
        }
    }
}

async function getCandidateContact(candidateEmail) {
    let contact: Contact;
    await axios
        .get(urls.candidate(), { headers: urls.qualtricsHeader() })
        .then((response) => {
            let candidates = response.data.result.elements;
            for (let candidate in candidates) {
                if (candidates[candidate].email == candidateEmail) {
                    contact = {
                        contactId: candidates[candidate].contactId,
                        firstName: candidates[candidate].firstName,
                        email: candidates[candidate].email
                    }
                    return contact;
                }
            }
        })
        .catch((error) => {
            console.log(`Error while trying to get candidates: "${error}" `);
        });
    return contact;
}
