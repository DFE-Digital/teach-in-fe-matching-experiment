const { app } = require('@azure/functions');
const axios = require("axios");
const urls = require("./urls");
const collegeGroupModule = require("./college-group");
const emailModule = require("./email-details");

app.http('send-candidate-details', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        let activeCollegeGroups = await getCollegeGroups(context);
        if(activeCollegeGroups.length > 0) {
            let collegeGroupIds = [];
            for (let i = 0; i < activeCollegeGroups.length; i++) {
                context.log(`College-group-name =  "${activeCollegeGroups[i].firstName}"`);
                collegeGroupIds.push(activeCollegeGroups[i].extRef);
            }

            let activeColleges = await getActiveColleges(collegeGroupIds, context);
            let collogeIds = [];
            for (let j = 0; j < activeColleges.length; j++) {
                collogeIds.push(activeColleges[j].extRef);
            }

            let activeCandidates = await getActiveCandidates(collogeIds, context);

            let candidateDataToSend = prepareCandidateDetailsToSend(activeCollegeGroups, activeColleges, activeCandidates, context);

            constructEmailAndSend(candidateDataToSend, activeCandidates, context);

            for (let x = 0; x < candidateDataToSend.length; x++) {
                context.log(` `);
                context.log(`============================ "${candidateDataToSend[x].collegeGroupName}" ============================`);
                context.log(`"${candidateDataToSend[x].collegeGroupEmail}"`);
                let candidates = candidateDataToSend[x].candidates;
                for (let y = 0; y < candidates.length; y++) {
                    context.log(` `);
                    context.log(`-------------------------- "${(y+1)}"-----------------------------------`);
                    context.log(`++++++++++ Colloge Name = "${candidates[y].collegeName}"`);
                    context.log(`++++++++++ Candidate Name = "${candidates[y].candidateFirstName}"`);
                    context.log(`++++++++++ Candidate Email = "${candidates[y].candidateEmail}"`);
                    context.log(`++++++++++ Subject = "${candidates[y].subject}"`);
                    context.log(`++++++++++ Sub-subject = "${candidates[y].subSubject}"`);
                    context.log(`++++++++++ Qualification = "${candidates[y].qualification}"`);
                    context.log(`++++++++++ Experience = "${candidates[y].experience}"`);
                    context.log(`++++++++++ Availability =  "${candidates[y].availability}"`);
                }
            }

        }
    }
});

function constructEmailAndSend(candidateDataToSend, activeCandidates, context) {

    let emailAddressToSend = '';
    let emailSubjectToSend = 'Potential teacher contact information';
    
    for (let x = 0; x < candidateDataToSend.length; x++) {
        emailAddressToSend = candidateDataToSend[x].collegeGroupEmail;
        let emailBodyToSend = '<p paraeid="{6bd117ae-00be-45d2-9e11-5a0f067851b4}{79}" paraid="1664028722"><img src="https://dferesearch.eu.qualtrics.com/CP/Graphic.php?IM=IM_3UDhH8iz4YHUyIS" style="width: 334px; height: 35px;" />' + 
    '<br /><br /><span style="font-size:19px;"><span style="font-family:Arial,Helvetica,sans-serif;">Hello, &nbsp;</span></span></p><p paraeid="{6bd117ae-00be-45d2-9e11-5a0f067851b4}{89}" paraid="174323858">' + 
    '<span style="font-size:19px;"><span style="font-family:Arial,Helvetica,sans-serif;">Thank you for agreeing to take part in our trial to introduce potential FE teachers to local colleges.&nbsp;</span></span></p>' + 
    '<p paraeid="{6bd117ae-00be-45d2-9e11-5a0f067851b4}{99}" paraid="1789928282"><span style="font-size:19px;"><span style="font-family:Arial,Helvetica,sans-serif;">Here are the contact details of potential teachers who are local to your college. &nbsp;</span></span></p>' + 
    '<p paraeid="{6bd117ae-00be-45d2-9e11-5a0f067851b4}{117}" paraid="1909929386"><span style="font-size:19px;"><span style="font-family:Arial,Helvetica,sans-serif;">Note that this information has not been verified by DfE.<br /><br />' + 
    'DfE has also not conducted DBS checks or taken any other steps to determine anyone\'s suitability to teach in FE.&nbsp;</span></span></p><p paraeid="{6bd117ae-00be-45d2-9e11-5a0f067851b4}{127}" paraid="848551701"><span style="font-size:19px;">' + 
    '<span style="font-family:Arial,Helvetica,sans-serif;">We ask that you:&nbsp;</span></span></p><ul role="list">' + 
    '<li aria-setsize="-1" data-aria-level="1" data-aria-posinset="1" data-font="Calibri" data-leveltext="-" data-list-defn-props="{&quot;335552541&quot;:1,&quot;335559684&quot;:-2,&quot;335559685&quot;:720,&quot;335559991&quot;:360,&quot;469769226&quot;:&quot;Calibri&quot;,&quot;469769242&quot;:[8226],&quot;469777803&quot;:&quot;left&quot;,&quot;469777804&quot;:&quot;-&quot;,&quot;469777815&quot;:&quot;hybridMultilevel&quot;}" data-listid="51" role="listitem"><p paraeid="{6bd117ae-00be-45d2-9e11-5a0f067851b4}{133}" paraid="651077223"><span style="font-size:19px;">' + 
    '<span style="font-family:Arial,Helvetica,sans-serif;">at a minimum, contact each person listed here to invite them to have an informal conversation about teaching, or acknowledge their interest and explain why they’re not suitable at this time&nbsp;</span></span></p></li>' + 
    '<li aria-setsize="-1" data-aria-level="1" data-aria-posinset="2" data-font="Calibri" data-leveltext="-" data-list-defn-props="{&quot;335552541&quot;:1,&quot;335559684&quot;:-2,&quot;335559685&quot;:720,&quot;335559991&quot;:360,&quot;469769226&quot;:&quot;Calibri&quot;,&quot;469769242&quot;:[8226],&quot;469777803&quot;:&quot;left&quot;,&quot;469777804&quot;:&quot;-&quot;,&quot;469777815&quot;:&quot;hybridMultilevel&quot;}" data-listid="51" role="listitem"><p paraeid="{6bd117ae-00be-45d2-9e11-5a0f067851b4}{148}" paraid="1711544910"><span style="font-size:19px;">' + 
    '<span style="font-family:Arial,Helvetica,sans-serif;">keep a record of your interactions with these potential teachers and outcomes of any engagement with them, so you can share that information with DfE at the end of this trial. [Visit our website to see what kind of information to record and&nbsp;get a&nbsp;helpful template to store those details.]</span></span></p></li></ul>';
    

        let candidates = candidateDataToSend[x].candidates;
        for (let y = 0; y < candidates.length; y++) {
            context.log(` `);
            context.log(`-------------------------- "${(y+1)}"-----------------------------------`);
            
            emailBodyToSend += '<p aria-level="2" paraeid="{6bd117ae-00be-45d2-9e11-5a0f067851b4}{175}" paraid="752951180" role="heading"><span style="font-size:19px;"><span style="font-family:Arial,Helvetica,sans-serif;"><strong>Potential teacher in (( ' + candidates[y].subject + ' ))&nbsp;</strong></span></span></p><p paraeid="{6bd117ae-00be-45d2-9e11-5a0f067851b4}{193}" paraid="760254646"><span style="font-size:19px;"><strong><span style="font-family:Arial,Helvetica,sans-serif;">Name</span></strong></span></p><p paraeid="{6bd117ae-00be-45d2-9e11-5a0f067851b4}{199}" paraid="944917747"><span style="font-size:19px;"><span style="font-family:Arial,Helvetica,sans-serif;">((';
            emailBodyToSend += ' ' + candidates[y].candidateFirstName + '  )) &nbsp;<br />(( ' + candidates[y].candidateLastName + '  ))&nbsp;</span></span></p><p paraeid="{6bd117ae-00be-45d2-9e11-5a0f067851b4}{251}" paraid="1263943625"><span style="font-size:19px;"><strong><span style="font-family:Arial,Helvetica,sans-serif;">Email address&nbsp;</span></strong></span></p><p paraeid="{d3323db6-d56c-4190-8c90-8d515f557ae0}{4}" paraid="1157530488"><span style="font-size:19px;"><span style="font-family:Arial,Helvetica,sans-serif;">((';
            emailBodyToSend += ' ' + candidates[y].candidateEmail + '  ))&nbsp;</span><br /><br /><strong><span style="font-family:Arial,Helvetica,sans-serif;">Colleges they have matched with&nbsp;</span></strong><br /><span style="font-family:Arial,Helvetica,sans-serif;">((';
            emailBodyToSend += ' ' + candidates[y].collegeName + ' ))<br />&nbsp;</span></span><br />&nbsp;</p>';
            if (candidates[y].subject == 'Construction') {
                emailBodyToSend += '<p paraeid="{d3323db6-d56c-4190-8c90-8d515f557ae0}{34}" paraid="1243041528"><span style="font-size:19px;"><span style="font-family:Arial,Helvetica,sans-serif;"><strong>Specialism</strong>&nbsp;<span style="background-color:#f1c40f;">[construction only]</span>' +
                '<br /> (( ' + candidates[y].subSubject + ' )) subject:&nbsp;&nbsp;</span></span></p> ';
            }
            
            emailBodyToSend += '<p paraeid="{d3323db6-d56c-4190-8c90-8d515f557ae0}{70}" paraid="1853459223"><span style="font-size:19px;"><strong><span style="font-family:Arial,Helvetica,sans-serif;">Highest qualification level in subject</span></strong></span></p> ' +
            '<p paraeid="{d3323db6-d56c-4190-8c90-8d515f557ae0}{84}" paraid="1639913896"><span style="font-size:19px;"><span style="font-family:Arial,Helvetica,sans-serif;">(( ' + candidates[y].qualification + ' ))&nbsp;</span></span></p>'
            emailBodyToSend += '<p paraeid="{d3323db6-d56c-4190-8c90-8d515f557ae0}{110}" paraid="1789690342"><span style="font-size:19px;"><strong><span style="font-family:Arial,Helvetica,sans-serif;">Years of experience in subject&nbsp;</span></strong></span></p>' + 
            '<p paraeid="{d3323db6-d56c-4190-8c90-8d515f557ae0}{120}" paraid="1776369261"><span style="font-size:19px;"><span style="font-family:Arial,Helvetica,sans-serif;">(( ' + candidates[y].experience + ' ))&nbsp;</span></span></p>';
            emailBodyToSend += '<p paraeid="{d3323db6-d56c-4190-8c90-8d515f557ae0}{146}" paraid="258296084"><span style="font-size:19px;"><strong><span style="font-family:Arial,Helvetica,sans-serif;">Hours of teaching they are interested in &nbsp;</span></strong></span></p>' + 
            '<p paraeid="{d3323db6-d56c-4190-8c90-8d515f557ae0}{152}" paraid="1743760714"><span style="font-size:19px;"><span style="font-family:Arial,Helvetica,sans-serif;">(( ' +candidates[y].availability + ' ))  &nbsp;<br /><br />';
        
            setCollegeStatusToSent(candidates[y].candidateContactId, candidates[y].collegeId, activeCandidates, context);
        }

        emailBodyToSend += '<p paraeid="{d3323db6-d56c-4190-8c90-8d515f557ae0}{222}" paraid="914133319"><span style="font-size:19px;"><span style="font-family:Arial,Helvetica,sans-serif;">We are providing this information as part of the DfE trial to introduce potential FE teachers to colleges local to them.&nbsp;</span></span></p>' + 
        '<p paraeid="{d3323db6-d56c-4190-8c90-8d515f557ae0}{228}" paraid="767933423"><span style="font-size:19px;"><span style="font-family:Arial,Helvetica,sans-serif;">It is provided on the understanding that your college has agreed to:&nbsp;</span></span></p>' + 
        '<ul role="list">' + 
            '<li aria-setsize="-1" data-aria-level="1" data-aria-posinset="1" data-font="Calibri" data-leveltext="-" data-list-defn-props="{&quot;335552541&quot;:1,&quot;335559684&quot;:-2,&quot;335559685&quot;:720,&quot;335559991&quot;:360,&quot;469769226&quot;:&quot;Calibri&quot;,&quot;469769242&quot;:[8226],&quot;469777803&quot;:&quot;left&quot;,&quot;469777804&quot;:&quot;-&quot;,&quot;469777815&quot;:&quot;hybridMultilevel&quot;}" data-listid="49" role="listitem">' + 
            '<p paraeid="{d3323db6-d56c-4190-8c90-8d515f557ae0}{238}" paraid="1421433112"><span style="font-size:19px;"><span style="font-family:Arial,Helvetica,sans-serif;">only share the information we send you with members of staff who have a need to see it, for example, the recruitment manager for the relevant department.&nbsp;</span></span></p>' + 
            '</li>' + 
            '<li aria-setsize="-1" data-aria-level="1" data-aria-posinset="2" data-font="Calibri" data-leveltext="-" data-list-defn-props="{&quot;335552541&quot;:1,&quot;335559684&quot;:-2,&quot;335559685&quot;:720,&quot;335559991&quot;:360,&quot;469769226&quot;:&quot;Calibri&quot;,&quot;469769242&quot;:[8226],&quot;469777803&quot;:&quot;left&quot;,&quot;469777804&quot;:&quot;-&quot;,&quot;469777815&quot;:&quot;hybridMultilevel&quot;}" data-listid="49" role="listitem">' + 
            '<p paraeid="{d3323db6-d56c-4190-8c90-8d515f557ae0}{245}" paraid="845153675"><span style="font-size:19px;"><span style="font-family:Arial,Helvetica,sans-serif;">not share the information we send you with anyone outside the college.&nbsp;&nbsp;</span></span></p>' + 
            '</li>' + 
            '<li aria-setsize="-1" data-aria-level="1" data-aria-posinset="3" data-font="Calibri" data-leveltext="-" data-list-defn-props="{&quot;335552541&quot;:1,&quot;335559684&quot;:-2,&quot;335559685&quot;:720,&quot;335559991&quot;:360,&quot;469769226&quot;:&quot;Calibri&quot;,&quot;469769242&quot;:[8226],&quot;469777803&quot;:&quot;left&quot;,&quot;469777804&quot;:&quot;-&quot;,&quot;469777815&quot;:&quot;hybridMultilevel&quot;}" data-listid="50" role="listitem">' + 
            '<p paraeid="{d3323db6-d56c-4190-8c90-8d515f557ae0}{252}" paraid="998054458"><span style="font-size:19px;"><span style="font-family:Arial,Helvetica,sans-serif;">store the information in a place that can only be accessed by employees of the college who have a need to see it.</span></span></p>' + 
            '</li>' + 
        '</ul>' + 
        '<p paraeid="{917baca7-2f00-4c5e-8937-b9488e4d1eb1}{4}" paraid="1175779441"><span style="font-size:19px;"><span style="font-family:Arial,Helvetica,sans-serif;">If you have questions about this DfE trial or the information given here, email the Teach in FE team at <a href="mailto:college.match@education.gov.uk">college.match@education.gov.uk</a></span></span></p>' + 
        '<p paraeid="{917baca7-2f00-4c5e-8937-b9488e4d1eb1}{17}" paraid="636603467"><span style="font-size:19px;"><span style="font-family:Arial,Helvetica,sans-serif;">Thanks, &nbsp;</span></span></p>' + 
        '<font face="Arial, Helvetica, sans-serif"><span style="font-size: 19px;">Teach in Further Education</span></font>';

        let currentEmail = emailModule.emailDetails();
        currentEmail.email = emailAddressToSend;
        currentEmail.subject = emailSubjectToSend;
        currentEmail.body = emailBodyToSend;
        currentEmail.key = "thisisasecret";

        //invokeEmailSenderWorkflow(currentEmail, context);
        
    }
    
}

function setCollegeStatusToSent(candidateContactId, collegeId, activeCandidates, context) {
    let current_candidate; let updateFlag = false;
    for (let k = 0; k < activeCandidates.length; k++) {
        if(activeCandidates[k].contactId === candidateContactId) {
            if(activeCandidates[k].embeddedData.college1Id == collegeId ){
                updateFlag = true;
                current_candidate = {
                    "embeddedData": {
                        "college1Status" : "Sent"
                    }
                };
            } else if(activeCandidates[k].embeddedData.college2Id == collegeId ){
                updateFlag = true;
                current_candidate = {
                    "embeddedData": {
                        "college2Status" : "Sent"
                    }
                };
            
            } else if(activeCandidates[k].embeddedData.college3Id == collegeId ){
                updateFlag = true;
                current_candidate = {
                    "embeddedData": {
                        "college3Status" : "Sent"
                    }
                };
            
            } else if(activeCandidates[k].embeddedData.college4Id == collegeId ){
                updateFlag = true;
                current_candidate = {
                    "embeddedData": {
                        "college4Status" : "Sent"
                    }
                };
            
            } else if(activeCandidates[k].embeddedData.college5Id == collegeId ){
                updateFlag = true;
                current_candidate = {
                    "embeddedData": {
                        "college5Status" : "Sent"
                    }
                };
            }

            
            if (updateFlag) {
                const update_candidate_URL = urls.updateCandidate()+'/'+candidateContactId;
                axios.put(update_candidate_URL, current_candidate, { headers: urls.qualtricsHeader()})
                .then( (response) => {
                    context.log(`SUCCESS`);
                })
                .catch((error) => {
                    context.log(`Error when trying to update candidate: "${error}" `);
                });
            }
        }      
    }
}

function invokeEmailSenderWorkflow(currentEmail, context) {
    context.log(`-------------------------- "${currentEmail}"-----------------------------------`);
    
    axios.post(urls.invokeEmailSenderWorkflow(), currentEmail)
    .then( (response) => {
        context.log(`SUCCESS`);
    })
    .catch((error) => {
        context.log(`Some Error Log: "${error}" `);
    });    
}

function prepareCandidateDetailsToSend(activeCollegeGroups, activeColleges, activeCandidates, context) {
    let candidateDataToSend = [];
    for (let i = 0; i < activeCollegeGroups.length; i++) {
        context.log(`College-group-name =  "${activeCollegeGroups[i].firstName}"`);
        let currentCollege = collegeGroupModule.collegeGroup();
        currentCollege.collegeGroupName = activeCollegeGroups[i].firstName;
        currentCollege.collegeGroupEmail = activeCollegeGroups[i].email;
        
        for (let j = 0; j < activeColleges.length; j++) {
            if(activeCollegeGroups[i].extRef == activeColleges[j].embeddedData.groupId) {
                for (let k = 0; k < activeCandidates.length; k++) {
                    if((activeColleges[j].extRef == activeCandidates[k].embeddedData.college1Id && activeCandidates[k].embeddedData.college1Status != 'Sent')
                        || (activeColleges[j].extRef == activeCandidates[k].embeddedData.college2Id && activeCandidates[k].embeddedData.college2Status != 'Sent')
                        || (activeColleges[j].extRef == activeCandidates[k].embeddedData.college3Id && activeCandidates[k].embeddedData.college3Status != 'Sent')
                        || (activeColleges[j].extRef == activeCandidates[k].embeddedData.college4Id && activeCandidates[k].embeddedData.college4Status != 'Sent')
                        || (activeColleges[j].extRef == activeCandidates[k].embeddedData.college5Id && activeCandidates[k].embeddedData.college5Status != 'Sent')) {
                        let currentCandidate = {
                            "candidateContactId": activeCandidates[k].contactId,
                            "collegeId": activeColleges[j].extRef,
                            "collegeName": activeColleges[j].firstName + ' ' + activeColleges[j].lastName,
                            "candidateFirstName": activeCandidates[k].firstName,
                            "candidateLastName": activeCandidates[k].lastName,
                            "candidateEmail": activeCandidates[k].email,
                            "subject": activeCandidates[k].embeddedData.subject,
                            "subSubject": activeCandidates[k].embeddedData.subSubject,
                            "qualification": activeCandidates[k].embeddedData.qualification,
                            "experience": activeCandidates[k].embeddedData.experience,
                            "availability": activeCandidates[k].embeddedData.availability
                        };
                        currentCollege.candidates.push(currentCandidate);
                    }
                }
            }
        }
        candidateDataToSend.push(currentCollege);
    }

    return candidateDataToSend;
}

async function getCollegeGroups(context) {
    let activeCollegeGroup = [];
    await axios
        .get(urls.group(), { headers: urls.qualtricsHeader() })
        .then((response) => {
            let collegeGroups = response.data.result.elements;
            for (let i = 0; i < collegeGroups.length; i++) {
                if (collegeGroups[i].embeddedData.groupStatus == "Active"
                ) {
                    activeCollegeGroup.push(collegeGroups[i]);
                }
            }

        })
        .catch((error) => {
            context.log.error(
                `Error while trying to fetch college-groups: `,
                error,
            );
        });

    return activeCollegeGroup;
}

async function getActiveCandidates(collogeIds, context) {
    context.log(`///////////////////////////////////// getActiveCandidates : `);
    let activeContactId = [];
    await axios
        .get(urls.candidate(), { headers: urls.qualtricsHeader() })
        .then((response) => {
            let candidates = response.data.result.elements;
            for (let candidate in candidates) {
                if ((collogeIds.includes(candidates[candidate].embeddedData.college1Id) && candidates[candidate].embeddedData.college1Status != 'Sent')
                    || (collogeIds.includes(candidates[candidate].embeddedData.college2Id) && candidates[candidate].embeddedData.college2Status != 'Sent')
                    || (collogeIds.includes(candidates[candidate].embeddedData.college3Id) && candidates[candidate].embeddedData.college3Status != 'Sent')
                    || (collogeIds.includes(candidates[candidate].embeddedData.college4Id) && candidates[candidate].embeddedData.college4Status != 'Sent')
                    || (collogeIds.includes(candidates[candidate].embeddedData.college5Id) && candidates[candidate].embeddedData.college5Status != 'Sent')
                ) {
                    activeContactId.push(candidates[candidate]);
                    context.log(`Found active candidate : "${candidates[candidate].firstName}" `);
                }
            }
        })
        .catch((error) => {
            context.log(`Error while trying to get candidates: "${error}" `);
        });
    return activeContactId;
}

async function getActiveColleges(collegeGroupIds, context) {
    let activeColleges = [];
    await axios
        .get(urls.college(), { headers: urls.qualtricsHeader() })
        .then((response) => {
            let colleges = response.data.result.elements;
            for (let college in colleges) {
                if (collegeGroupIds.includes(colleges[college].embeddedData.groupId)) {
                    activeColleges.push(colleges[college]);
                    context.log(`Found active collegege : "${colleges[college].firstName}" `);
                }
            }
        })
        .catch((error) => {
            context.log(`Error while trying to fetch colleges : `, error);
        });

    return activeColleges;
}

