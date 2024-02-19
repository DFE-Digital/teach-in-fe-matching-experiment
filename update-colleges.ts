import 'dotenv/config'

import config from "./src/config";
import { createCollegeGroup, getCollegeGroupByExtRef } from "./src/qualtrics/college-group-service";
import { createCollege, getCollegeByExtRef } from "./src/qualtrics/college-service";
import { College } from "./src/types";

import axios from 'axios';
import { exit } from 'process';

const write = true;
const overwriteGroupEmails = false;
const resetGroupStatus = false;

const collegeGroupsUrl = config.dataSourceUrlCollegeGroups;
const collegesUrl = config.dataSourceUrlColleges;

type SourceCollegeCampus = {
    campusName: string,
    address: string,
    postcode: string,
};

type SourceCollege =   {
    id: string,
    collegeName: string,
    URN?: string,
    website?: string,
    parentId?: string,
    campuses: SourceCollegeCampus[],
  };

type SourceCollegeGroup = {
    groupId: string,
    name: string,
    URN?: string,
    website?: string,
  }

type PostcodesIOResponse = {
    result: {
        longitude: number,
        latitude: number,
    }
}

// const createEmailAddress = (collegeGroup: CollegeGroup) => `${collegeGroup.extRef}@${config.mailinatorDomain}`;
const createEmailAddress = (collegeGroup: SourceCollegeGroup) => `college.match+${collegeGroup.name.toLowerCase().trim().substring(0, 25).trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}@education.gov.uk`;

const getSourceCollegeGroupId = (college: SourceCollege, collegeGroups: SourceCollegeGroup[]) : string => {
    if(college.parentId) {
        return getCollegeGroupReference(college.parentId);
    }

    const newSourceCollegeGroup = {
        groupId: `college-${college.id}`,
        name: college.collegeName,
    }

    collegeGroups.push(newSourceCollegeGroup);

    return getCollegeGroupReference(newSourceCollegeGroup.groupId);
}

const getCollegeReference = (collegeId: string) => `tife-college-${collegeId}`;
const getCollegeGroupReference = (collegeGroupId: string) => `tife-college-group-${collegeGroupId}`;


(async () => {
    const colleges: SourceCollege[] = [...(await axios.get(collegesUrl)).data];
    const collegeGroups: SourceCollegeGroup[] = [...(await axios.get(collegeGroupsUrl)).data];

    const qualtricsColleges : College[] = [];

    for(const college of colleges) {
        const extRef = getCollegeReference(college.id);

        let qualtricsCollege = await getCollegeByExtRef(extRef);

        const name = college.collegeName;
        const groupId = getSourceCollegeGroupId(college, collegeGroups);

        if(!qualtricsCollege) {
            qualtricsCollege = {
                extRef: extRef,
                firstName: name,
                embeddedData: {
                    groupId
                }
            };
        } else {
            qualtricsCollege.firstName = name;
        }

        if(college.campuses.length != 1) {
            console.error("College with other than 1 campus. This is not currently supported.", college);
            exit(1);
        }

        const postcode = college.campuses[0].postcode.replace(/[^A-Za-z0-9]/g, '');

        try {
            const postcodeResponse: PostcodesIOResponse = (await axios.get(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`)).data;

            qualtricsCollege.embeddedData.lat = postcodeResponse.result.latitude;
            qualtricsCollege.embeddedData.long = postcodeResponse.result.longitude;
        } catch(e) {
            console.error("Invalid college postcode", college);
        }

        qualtricsColleges.push(qualtricsCollege);
    }

    for(const collegeGroup of collegeGroups) {
        const extRef = getCollegeGroupReference(collegeGroup.groupId);

        let qualtricsCollegeGroup = await getCollegeGroupByExtRef(extRef);

        const name = collegeGroup.name;
        const email = createEmailAddress(collegeGroup);

        if(!qualtricsCollegeGroup) {
            qualtricsCollegeGroup = {
                extRef: extRef,
                email,
                embeddedData: {
                    groupName: name,
                    groupStatus: 'Unregistered',
                }
            }
        } else {
            qualtricsCollegeGroup.embeddedData.groupName = name;

            if(overwriteGroupEmails) {
                qualtricsCollegeGroup.email = email;
            }

            if(resetGroupStatus) {
                qualtricsCollegeGroup.embeddedData.groupStatus = 'Unregistered';
                qualtricsCollegeGroup.embeddedData.invitationAttempt = null;
            }
        }

        if(write) {
            console.log(`Writing college group ${qualtricsCollegeGroup.extRef} - ${qualtricsCollegeGroup.embeddedData.groupName}`);
            createCollegeGroup(qualtricsCollegeGroup);
        } else {
            console.log("Creating/updating college group", qualtricsCollegeGroup);
        }
    }

    for(const qualtricsCollege of qualtricsColleges) {
        if(write) {
            console.log(`Writing college ${qualtricsCollege.extRef} - ${qualtricsCollege.firstName}`);
            createCollege(qualtricsCollege);
        } else {
            console.log("Creating/updating college", qualtricsCollege);
        }
    }
})().then()