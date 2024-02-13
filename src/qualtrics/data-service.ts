export const moreThanOneWeek = (currentDate: any, invitedDate: any): Boolean => {
    let days: any = Math.abs(currentDate - invitedDate);
    let diffDays = Math.ceil(days / (1000 * 60 * 60 * 24)); 
    if (diffDays > 7) 
        return true;
    return false;
};

export const formatDate = (date: any, format: string) => {
    const map = {
        mm: (date.getMonth() + 1).toString().padStart(2, "0"),
        dd: date.getDate().toString().padStart(2, "0"),
        yyyy: date.getFullYear()
    }

    return format.replace(/mm|dd|yyyy/gi, matched => map[matched]);
};