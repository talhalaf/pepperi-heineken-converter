
$('#pdf-form').on('submit',function (e) {
    e.preventDefault();
    
    var emailTextbox = jQuery('[name=email]');
    var passwordTextbox = jQuery('[name=password]');
    var ActivityIDTextbox = jQuery('[name=ActivityID]');
    var auth = btoa(emailTextbox.val() + ':' + passwordTextbox.val());
    document.location.href='/PDF/'+ActivityIDTextbox.val()+'?auth='+auth;
});

