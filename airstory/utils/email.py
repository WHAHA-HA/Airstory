from email.mime.text import MIMEText
import uuid

from tornado_smtpclient.client import SMTPAsync

from airstory.utils import logger
from config import get_config


class EmailService:
    async def send(self, to, subject, body):
        unique = str(uuid.uuid4())
        
        logger.info('EmailService:send:request:' + unique)
        
        msg = MIMEText(body)
        msg['Subject'] = subject

        msg['From'] = get_config()['app']['from_email']
        msg['To'] = to
        
        # Send the message via our own SMTP server.
        s = SMTPAsync()
        
        await s.connect('email-smtp.us-east-1.amazonaws.com', 587)
        await s.starttls()
        await s.login('AKIAJKS7HWWYTDE3NSTA', 'AnoiOg9Io/fmr93n/Gy8uYU9TdW2nCGGLeyqex6j9CXj')
        await s.sendmail(msg['From'], msg['To'], msg.as_string())
        await s.quit()
        
        logger.info('EmailService:send:response:' + unique)
    
email_service = EmailService()