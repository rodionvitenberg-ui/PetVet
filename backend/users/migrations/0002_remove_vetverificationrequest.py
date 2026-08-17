# Generated manually: vet verification replaced by Stripe subscription.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.DeleteModel(
            name='VetVerificationRequest',
        ),
    ]