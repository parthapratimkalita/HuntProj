from app.core.supabase import supabase

async def send_booking_confirmation_email(email: str, booking_data: dict) -> None:
    """
    Send booking confirmation email using Supabase
    """
    try:
        # Format the email content
        subject = "Booking Confirmation"
        content = f"""
        Your booking has been confirmed!
        
        Booking Details:
        - Property: {booking_data.get('property', {}).get('title', 'N/A')}
        - Check-in: {booking_data.get('check_in_date')}
        - Check-out: {booking_data.get('check_out_date')}
        - Total Price: ${booking_data.get('total_price')}
        - Status: {booking_data.get('status')}
        
        Thank you for choosing our service!
        """
        
        # Send email using Supabase
        supabase.functions.invoke(
            'send-email',
            {
                'to': email,
                'subject': subject,
                'content': content
            }
        )
    except Exception as e:
        # Log the error but don't raise it to prevent booking creation from failing
        print(f"Failed to send booking confirmation email: {str(e)}") 