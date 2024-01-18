module.exports = {
    group: function() {
        return 'https://fra1.qualtrics.com/API/v3/directories/POOL_eXlYYCcaYMiHNwR/mailinglists/CG_1QoRmBOIp5ne9iE/contacts?includeEmbedded=true';
    },
    college: function() {
        return 'https://fra1.qualtrics.com/API/v3/directories/POOL_eXlYYCcaYMiHNwR/mailinglists/CG_2tybuwkdaRRTD3n/contacts?includeEmbedded=true';
    },
    candidate: function() {
        return 'https://fra1.qualtrics.com/API/v3/directories/POOL_eXlYYCcaYMiHNwR/mailinglists/CG_3Jqsb9eUesCm2Wc/contacts?includeEmbedded=true';
    },
    updateCollegeGroup: function() {
        return 'https://fra1.qualtrics.com/API/v3/directories/POOL_eXlYYCcaYMiHNwR/mailinglists/CG_1QoRmBOIp5ne9iE/contacts';
    },
    updateCandidate: function() {
        return 'https://fra1.qualtrics.com/API/v3/directories/POOL_eXlYYCcaYMiHNwR/mailinglists/CG_3Jqsb9eUesCm2Wc/contacts';
    },
    qualtricsHeader: function() {
        return {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-API-TOKEN": process.env.QUALTRICS_ENV
        }
    }
}