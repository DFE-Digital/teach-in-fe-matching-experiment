const { app } = require('@azure/functions');
const axios = require('axios');

app.http('register-candidate', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {

        const college_URL = 'https://fra1.qualtrics.com/API/v3/directories/POOL_eXlYYCcaYMiHNwR/mailinglists/CG_2tybuwkdaRRTD3n/contacts?includeEmbedded=true';
        const candidate_URL = 'https://fra1.qualtrics.com/API/v3/directories/POOL_eXlYYCcaYMiHNwR/mailinglists/CG_3Jqsb9eUesCm2Wc/contacts?includeEmbedded=true';
  
        const qualtricsHeader = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-API-TOKEN": process.env.QUALTRICS_ENV
        }
        
        const requestData = await request.json();

        const candidateLat = requestData.lat; //51.496351
        const candidateLong = requestData.long; // -0.087925
        const candidateContactId = await getContactId(candidate_URL, qualtricsHeader, requestData.email, context);
        context.log(`Candidate contactID after returned : "${candidateContactId}" `);

        let distances = [];
        await axios.get(college_URL, { headers: qualtricsHeader})
        .then( (response) => {
            let colleges = response.data.result.elements;
            // context.log(`Colleges = "${colleges}"`);
            for (let college in colleges) {
                let collegeLat = colleges[college].embeddedData.lat;
                let collegeLong = colleges[college].embeddedData.long;
                let extRef = colleges[college].extRef;
                let collegeStatus = colleges[college].embeddedData.collegeStatus;
                let collegeContactId = colleges[college].contactId;

                let R = 6371; // Radius of the earth in km
                let dLat = deg2rad(collegeLat-candidateLat);  // deg2rad below
                let dLon = deg2rad(collegeLong-candidateLong); 
                let a = 
                Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(deg2rad(candidateLat)) * Math.cos(deg2rad(collegeLat)) * 
                Math.sin(dLon/2) * Math.sin(dLon/2); 
                let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
                let d = R * c; // Distance in km
                if (d < 40.1) {
                    let currentDistance = {
                        "collegeContactId": collegeContactId,
                        "collegeStatus": collegeStatus,
                        "collegeId": extRef,
                        "distance": d
                    };
                    distances.push(currentDistance);
                }
            }
        })
        .catch((error) => {
            context.log.error(`Some Error Log: `, error);
        });
        let ordredDistances = distances.sort((a, b) => a.distance - b.distance);
        if(ordredDistances != undefined && ordredDistances.length > 0) {
            let collegeIds = [];
            for (let i = 0; i < ordredDistances.length; i++) {
                if (i < 5) { //change college status to needs invite for the first 5 colleges
                    collegeIds.push(ordredDistances[i].collegeId);
                    setCollegeToInvite(ordredDistances[i].collegeContactId, ordredDistances[i].collegeStatus, context, qualtricsHeader);
            }
        }
        
        assignToCollege(collegeIds, candidateContactId, context, qualtricsHeader, candidateLat, candidateLong);
        }
        
        return { body: JSON.stringify(ordredDistances) };
    }
    
   
});

function deg2rad(deg) {
    return deg * (Math.PI/180)
}

function assignToCollege(collegeIds, candidateContactId, context, qualtricsHeader, candidateLat, candidateLong) {
    context.log(`*************************************** collegeIds = "${collegeIds}" candidateLat = "${candidateLat}" candidateLong = "${candidateLong}" candidateContactId = "${candidateContactId}"`);
    let college1Id = '';
    let college2Id = '';
    let college3Id = '';
    let college4Id = '';
    let college5Id = '';
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
        "embeddedData": {
            "college1Id" : college1Id,
            "college2Id" : college2Id,
            "college3Id" : college3Id,
            "college4Id" : college4Id,
            "college5Id" : college5Id,
            "lat": candidateLat,
            "long": candidateLong
        }
    };
    const update_candidate_URL = 'https://fra1.qualtrics.com/API/v3/directories/POOL_eXlYYCcaYMiHNwR/mailinglists/CG_3Jqsb9eUesCm2Wc/contacts/'+candidateContactId;
    axios.put(update_candidate_URL, current_candidate, { headers: qualtricsHeader})
    .then( (response) => {
        context.log(`SUCCESS`);
    })
    .catch((error) => {
        context.log(`Some Error Log: "${error}" `);
    });    

}

function setCollegeToInvite(collegeContactId, collegeStatus, context, qualtricsHeader) {
    context.log(`-------------------------------------- collegeContactId = "${collegeContactId}" collegeStatus = "${collegeStatus}"`);
    if (collegeStatus == 'Unregistered') {
        let current_college = {
        "embeddedData": {
            "collegeStatus": "NeedsInvite"
        },
        "language": "EN",
        "unsubscribed": false
        };
        const update_college_URL = 'https://fra1.qualtrics.com/API/v3/directories/POOL_eXlYYCcaYMiHNwR/mailinglists/CG_2tybuwkdaRRTD3n/contacts/'+collegeContactId;
        axios.put(update_college_URL, current_college, { headers: qualtricsHeader});
    }
}

async function getContactId(candidate_URL, qualtricsHeader, candidateEmail, context) {
    context.log(`///////////////////////////////////// candidateEmail : "${candidateEmail}" `);
    let contactId = '';
    await axios.get(candidate_URL, { headers: qualtricsHeader})
        .then( (response) => {
            let candidates = response.data.result.elements;
            for (let candidate in candidates) {
                if (candidates[candidate].email == candidateEmail) {
                    contactId = candidates[candidate].contactId;
                    context.log(`Candidate contactID : "${contactId}" `);
                    return contactId;
                }
            }
        })
        .catch((error) => {
            context.log(`Some Error Log: "${error}" `);
        });    
    return contactId;
}