# Generated manually: single provider (Cryptomus) — provider field no longer needed.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0009_alter_subscription_provider_customer_id_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='subscription',
            name='provider',
        ),
    ]