# Generated manually: multi-provider subscription (Cryptomus + Lemon Squeezy).
# Renames Stripe-specific fields to provider-neutral ones and adds provider.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('billing', '0007_subscription'),
    ]

    operations = [
        migrations.RenameField(
            model_name='subscription',
            old_name='stripe_customer_id',
            new_name='provider_customer_id',
        ),
        migrations.RenameField(
            model_name='subscription',
            old_name='stripe_subscription_id',
            new_name='provider_subscription_id',
        ),
        migrations.AddField(
            model_name='subscription',
            name='provider',
            field=models.CharField(
                choices=[('cryptomus', 'Cryptomus'), ('lemonsqueezy', 'Lemon Squeezy')],
                default='cryptomus',
                max_length=20,
                verbose_name='Payment provider',
            ),
        ),
    ]