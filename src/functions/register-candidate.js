const { app } = require("@azure/functions");
const axios = require("axios");
const urls = require("./urls");

app.http("register-candidate", {
    methods: ["GET", "POST"],
    authLevel: "function",
    handler: async (request, context) => {
        const requestData = await request.json();

        const candidateLat = requestData.lat; //51.496351
        const candidateLong = requestData.long; // -0.087925
        const candidateContactId = await getContactId(
            requestData.email,
            context,
        );
        // context.log(`Candidate contactID after returned : "${candidateContactId}" `);

        // load all collge-groups data from qualtrics to local list
        let collegeGroups = await getCollegeGroups(context);

        // get the closest colloges to the candidate by using their lat/long
        let reachableColleges = await getClosestColleges(
            candidateLat,
            candidateLong,
            context,
        );

        // sort colleges by distance
        let ordredReachableColleges = reachableColleges.sort(
            (a, b) => a.reachableColleges - b.reachableColleges,
        );
        if (
            ordredReachableColleges != undefined &&
            ordredReachableColleges.length > 0
        ) {
            let collegeIds = [];
            let chosenGroupIds = [];
            let waitingListGroup = [];
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
                        // context.log(`NOT CHOSEN - NOT CHOSEN - NOT CHOSEN : "${ordredReachableColleges[i].collegeGroupId}" `);
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

            setCollegeGroupToNeedsInvite(
                collegeGroups,
                chosenGroupIds,
                context,
            );

            assignToCollege(
                collegeIds,
                candidateContactId,
                context,
                candidateLat,
                candidateLong,
            );
        }

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

async function getCollegeGroups(context) {
    let collegeGroup = [];
    await axios
        .get(urls.group(), { headers: urls.qualtricsHeader() })
        .then((response) => {
            collegeGroup = response.data.result.elements;
        })
        .catch((error) => {
            context.log.error(
                `Error while trying to fetch college-groups: `,
                error,
            );
        });

    return collegeGroup;
}

async function getClosestColleges(candidateLat, candidateLong, context) {
    let closestColleges = [];
    await axios
        .get(urls.college(), { headers: urls.qualtricsHeader() })
        .then((response) => {
            let colleges = response.data.result.elements;
            for (let college in colleges) {
                let collegeLat = colleges[college].embeddedData.lat;
                let collegeLong = colleges[college].embeddedData.long;
                let extRef = colleges[college].extRef;
                let collegeGroupId = colleges[college].embeddedData.groupId;

                let R = 6371; // Radius of the earth in km
                let dLat = deg2rad(collegeLat - candidateLat); // deg2rad below
                let dLon = deg2rad(collegeLong - candidateLong);
                let a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(deg2rad(candidateLat)) *
                        Math.cos(deg2rad(collegeLat)) *
                        Math.sin(dLon / 2) *
                        Math.sin(dLon / 2);
                let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                let d = R * c;
                if (d < 40.1) {
                    let currentDistance = {
                        collegeId: extRef,
                        distance: d,
                        collegeGroupId: collegeGroupId,
                    };
                    closestColleges.push(currentDistance);
                }
            }
        })
        .catch((error) => {
            context.log.error(`Error while trying to fetch colleges : `, error);
        });

    return closestColleges;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

function assignToCollege(
    collegeIds,
    candidateContactId,
    context,
    candidateLat,
    candidateLong,
) {
    // context.log(`*************************************** collegeIds = "${collegeIds}" candidateLat = "${candidateLat}" candidateLong = "${candidateLong}" candidateContactId = "${candidateContactId}"`);
    let college1Id = "";
    let college2Id = "";
    let college3Id = "";
    let college4Id = "";
    let college5Id = "";
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
    }
    let current_candidate = {
        embeddedData: {
            college1Id: college1Id,
            college2Id: college2Id,
            college3Id: college3Id,
            college4Id: college4Id,
            college5Id: college5Id,
            lat: candidateLat,
            long: candidateLong,
        },
    };
    const update_candidate_URL =
        urls.updateCandidate() + "/" + candidateContactId;
    axios
        .put(update_candidate_URL, current_candidate, {
            headers: urls.qualtricsHeader(),
        })
        .then((response) => {
            context.log(`SUCCESS`);
        })
        .catch((error) => {
            context.log(`Error when trying to update candidate: "${error}" `);
        });
}

function setCollegeGroupToNeedsInvite(collegeGroups, chosenGroupIds, context) {
    // context.log(`--------------------------------------"${chosenGroupIds}"`);

    for (let i = 0; i < collegeGroups.length; i++) {
        if (
            chosenGroupIds.includes(collegeGroups[i].extRef) &&
            collegeGroups[i].embeddedData.groupStatus == "Unregistered"
        ) {
            // context.log(`++----------------------------------++ collegeContactId = "${collegeGroups[i].extRef}" collegeStatus = "${collegeGroups[i].embeddedData.groupStatus}"`);

            let current_college = {
                embeddedData: {
                    groupStatus: "NeedsInvite",
                },
            };
            const update_college_URL =
                urls.updateCollegeGroup() + "/" + collegeGroups[i].contactId;
            axios.put(update_college_URL, current_college, {
                headers: urls.qualtricsHeader(),
            });
        }
    }
}

async function getContactId(candidateEmail, context) {
    // context.log(`///////////////////////////////////// candidateEmail : "${candidateEmail}" `);
    let contactId = "";
    await axios
        .get(urls.candidate(), { headers: urls.qualtricsHeader() })
        .then((response) => {
            let candidates = response.data.result.elements;
            for (let candidate in candidates) {
                if (candidates[candidate].email == candidateEmail) {
                    contactId = candidates[candidate].contactId;
                    // context.log(`Candidate contactID : "${contactId}" `);
                    return contactId;
                }
            }
        })
        .catch((error) => {
            context.log(`Error while trying to get candidates: "${error}" `);
        });
    return contactId;
}
